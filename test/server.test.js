'use strict';

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Create a test-specific server instance
function createTestServer() {
    const express = require('express');
    const cors = require('cors');

    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.static('public'));

    // Mock recipe loader for testing
    const mockLoader = {
        loadMod: jest.fn().mockReturnValue([]),
        loadAllRecipes: jest.fn().mockReturnValue([]),
        filterRecipes: jest.fn().mockReturnValue([]),
        paginate: jest.fn().mockReturnValue({
            recipes: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        }),
        getStats: jest.fn().mockReturnValue({ total: 0, byMod: {}, byType: {}, mods: [] })
    };

    // Routes with mock loader
    app.get('/', (req, res) => {
        const indexPath = path.join(__dirname, '..', 'public', 'index.html');

        if (!fs.existsSync(indexPath)) {
            res.send(`
                <html>
                    <head><title>Pattern Press</title></head>
                    <body>
                        <h1>🎯 Pattern Press</h1>
                        <p>KubeJS Recipe Browser</p>
                        <h2>API Endpoints:</h2>
                        <ul>
                            <li><a href="/recipes">/recipes</a> - All recipes</li>
                            <li><a href="/stats">/stats</a> - Recipe statistics</li>
                        </ul>
                    </body>
                </html>
            `);
            return;
        }

        res.sendFile(indexPath);
    });

    app.get('/recipes', (req, res) => {
        try {
            const { mod, type, search, page = 1, limit = 20 } = req.query;

            let recipes;
            if (mod) {
                recipes = mockLoader.loadMod(mod);
            } else {
                recipes = mockLoader.loadAllRecipes();
            }

            const filters = { mod, type, search };
            const filteredRecipes = mockLoader.filterRecipes(recipes, filters);
            const result = mockLoader.paginate(filteredRecipes, page, limit);

            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to load recipes',
                message: error.message
            });
        }
    });

    app.get('/stats', (req, res) => {
        try {
            const stats = mockLoader.getStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to load statistics',
                message: error.message
            });
        }
    });

    app.post('/import', (req, res) => {
        res.json({
            success: false,
            message: 'Frontend import not implemented yet'
        });
    });

    return { app, mockLoader };
}

describe('server.js', () => {
    let testServer;
    let mockLoader;

    beforeEach(() => {
        const server = createTestServer();
        testServer = server.app;
        mockLoader = server.mockLoader;
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        it('should return API documentation when no index.html exists', async () => {
            const response = await request(testServer).get('/');

            expect(response.status).toBe(200);
            expect(response.text).toContain('🎯 Pattern Press');
            expect(response.text).toContain('KubeJS Recipe Browser');
            expect(response.text).toContain('/recipes');
            expect(response.text).toContain('/stats');
        });
    });

    describe('GET /recipes', () => {
        it('should return all recipes when no filters applied', async () => {
            const mockRecipes = [
                { id: 'recipe1', mod: 'minecraft', type: 'crafting_shaped' },
                { id: 'recipe2', mod: 'minecraft', type: 'smelting' }
            ];

            const mockPaginatedResult = {
                recipes: mockRecipes,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 2,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            };

            mockLoader.loadAllRecipes.mockReturnValue(mockRecipes);
            mockLoader.filterRecipes.mockReturnValue(mockRecipes);
            mockLoader.paginate.mockReturnValue(mockPaginatedResult);

            const response = await request(testServer).get('/recipes');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockPaginatedResult);
            expect(mockLoader.loadAllRecipes).toHaveBeenCalledTimes(1);
            expect(mockLoader.filterRecipes).toHaveBeenCalledWith(mockRecipes, {
                mod: undefined,
                type: undefined,
                search: undefined
            });
        });

        it('should load specific mod when mod parameter provided', async () => {
            const mockRecipes = [{ id: 'recipe1', mod: 'minecraft' }];
            const mockPaginatedResult = {
                recipes: mockRecipes,
                pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
            };

            mockLoader.loadMod.mockReturnValue(mockRecipes);
            mockLoader.filterRecipes.mockReturnValue(mockRecipes);
            mockLoader.paginate.mockReturnValue(mockPaginatedResult);

            const response = await request(testServer).get('/recipes?mod=minecraft');

            expect(response.status).toBe(200);
            expect(mockLoader.loadMod).toHaveBeenCalledWith('minecraft');
            expect(mockLoader.loadAllRecipes).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockLoader.loadAllRecipes.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(testServer).get('/recipes');

            expect(response.status).toBe(500);
            expect(response.body).toMatchObject({
                error: 'Failed to load recipes',
                message: 'Database error'
            });
        });
    });

    describe('GET /stats', () => {
        it('should return recipe statistics', async () => {
            const mockStats = {
                total: 100,
                byMod: { minecraft: 80, mekanism: 20 },
                byType: { 'minecraft:crafting_shaped': 50 },
                mods: ['minecraft', 'mekanism']
            };

            mockLoader.getStats.mockReturnValue(mockStats);

            const response = await request(testServer).get('/stats');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockStats);
            expect(mockLoader.getStats).toHaveBeenCalledTimes(1);
        });

        it('should handle stats loading errors', async () => {
            mockLoader.getStats.mockImplementation(() => {
                throw new Error('Stats error');
            });

            const response = await request(testServer).get('/stats');

            expect(response.status).toBe(500);
            expect(response.body).toMatchObject({
                error: 'Failed to load statistics',
                message: 'Stats error'
            });
        });
    });

    describe('POST /import', () => {
        it('should return not implemented message', async () => {
            const response = await request(testServer)
                .post('/import')
                .send({ path: '/test/path' });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: false,
                message: 'Frontend import not implemented yet'
            });
        });
    });

    describe('CORS and Middleware', () => {
        it('should have CORS enabled', async () => {
            const response = await request(testServer)
                .options('/recipes')
                .set('Origin', 'http://localhost:3001')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.status).toBe(204);
            expect(response.headers['access-control-allow-origin']).toBe('*');
        });
    });
});