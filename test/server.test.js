const supertest = require('supertest');
const path = require('path');

// Mock modules before importing the server
jest.mock('../src/log-segmenter');
jest.mock('../src/parsers');

const { segmentLogContent } = require('../src/log-segmenter');
const { createDefaultDispatcher, processSegments } = require('../src/parsers');

describe('Server', () => {
    let serverModule;
    let segmentCalls;
    let dispatcherArgs;
    let processedSegments;

    beforeEach(() => {
        // Reset mocks and test data
        jest.clearAllMocks();
        segmentCalls = [];
        dispatcherArgs = [];

        const segments = [{ id: 1 }, { id: 2 }];

        processedSegments = [
            {
                dispatch: {
                    status: 'parsed',
                    handler: 'json-crafting-handler',
                    result: {
                        recipeType: '<recipetype:create:pressing>',
                        recipeId: 'create:press_brass',
                        data: {
                            item_inputs: [{ item: '<item:create:plate>', amount: 2 }],
                            item_outputs: [{ item: '<item:create:pressed_plate>', amount: 1 }]
                        }
                    }
                }
            },
            {
                recipeType: '<recipetype:minecraft:crafting>',
                dispatch: {
                    status: 'parsed',
                    handler: 'shaped-crafting-handler',
                    result: {
                        pattern: '<item:minecraft:stick> <item:minecraft:stick>',
                        output: '<item:minecraft:ladder>'
                    }
                }
            },
            {
                dispatch: {
                    status: 'parsed',
                    handler: 'shapeless-crafting-handler',
                    result: {
                        recipeType: '<recipetype:create:mixing>',
                        recipeId: 'create:dough',
                        ingredients: '<item:create:andesite_alloy> <item:minecraft:water_bucket>',
                        output: '<item:create:dough>'
                    }
                }
            },
            {
                startLine: 1,
                endLine: 2,
                dispatch: { status: 'error', error: 'boom' }
            },
            {
                startLine: 3,
                endLine: 4,
                dispatch: { status: 'unknown' }
            }
        ];

        // Setup mocks
        segmentLogContent.mockImplementation((content) => {
            segmentCalls.push(content);
            return segments;
        });

        createDefaultDispatcher.mockImplementation((options) => {
            dispatcherArgs.push(options);
            return { logger: options.logger };
        });

        processSegments.mockImplementation(async () => processedSegments);

        // Import server module after mocks are set up
        jest.isolateModules(() => {
            serverModule = require('../src/server');
        });
    });

    describe('parseRecipeLog', () => {
        test('normalizes dispatcher output', async () => {
            const recipes = await serverModule.parseRecipeLog('log contents');

            expect(segmentCalls).toHaveLength(1);
            expect(segmentCalls[0]).toBe('log contents');
            expect(dispatcherArgs).toHaveLength(1);
            expect(recipes).toHaveLength(3);

            const [jsonRecipe, shapedRecipe, shapelessRecipe] = recipes;
            expect(jsonRecipe.format).toBe('addJsonRecipe');
            expect(shapedRecipe.format).toBe('addShaped');
            expect(shapelessRecipe.format).toBe('addShapeless');
            expect(shapelessRecipe.machineType).toBe('mixing');
            expect(shapedRecipe.outputs.items[0].item).toBe('<item:minecraft:ladder>');
        });
    });

    describe('Routes', () => {
        test('GET / serves static index.html', async () => {
            const request = supertest(serverModule.app);
            const response = await request.get('/');

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toMatch(/html/);
        });

        test('POST /upload validates file presence', async () => {
            const request = supertest(serverModule.app);
            const response = await request.post('/upload');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('No file uploaded');
        });

        test('POST /upload handles processing errors', async () => {
            // Override mock for this test to throw an error
            segmentLogContent.mockImplementation(() => {
                throw new Error('Segmentation failed');
            });

            jest.isolateModules(() => {
                serverModule = require('../src/server');
            });

            const request = supertest(serverModule.app);
            const response = await request
                .post('/upload')
                .attach('logFile', Buffer.from('invalid log'), 'test.log');

            expect(response.status).toBe(500);
            expect(response.body.error).toMatch(/Error processing file/);
        });

        test('upload -> recipes -> stats flow uses parsed cache', async () => {
            const request = supertest(serverModule.app);

            const initialRecipes = await request.get('/recipes');
            expect(initialRecipes.body.total).toBe(0);

            const uploadResponse = await request
                .post('/upload')
                .attach('logFile', Buffer.from('fake log contents'), 'crafttweaker.log');

            expect(uploadResponse.status).toBe(200);
            expect(uploadResponse.body.success).toBe(true);
            expect(uploadResponse.body.stats.total).toBe(3);

            const recipesResponse = await request.get('/recipes').query({ limit: 2, page: 1 });
            expect(recipesResponse.body.recipes).toHaveLength(2);
            expect(recipesResponse.body.total).toBe(3);
            expect(recipesResponse.body.totalPages).toBe(2);

            const filteredByMod = await request.get('/recipes').query({ mod: 'create' });
            expect(filteredByMod.body.recipes.every((recipe) => recipe.mod === 'create')).toBe(true);

            const searchByName = await request.get('/recipes').query({ search: 'ladder' });
            expect(searchByName.body.recipes).toHaveLength(1);

            const statsResponse = await request.get('/stats');
            expect(statsResponse.body.total).toBe(3);
            expect(statsResponse.body.byMod.create).toBe(2);
        });

        test('GET /recipes handles edge cases', async () => {
            const request = supertest(serverModule.app);

            // Upload test data first
            await request
                .post('/upload')
                .attach('logFile', Buffer.from('test log'), 'test.log');

            const invalidPage = await request.get('/recipes').query({ page: 'invalid', limit: 'bad' });
            expect(invalidPage.status).toBe(200);
            expect(invalidPage.body.page).toBe(1);

            const emptyFilters = await request.get('/recipes').query({ type: '', mod: '', search: '' });
            expect(emptyFilters.status).toBe(200);
            expect(emptyFilters.body.total).toBe(3);

            const noResults = await request.get('/recipes').query({ search: 'nonexistent' });
            expect(noResults.body.total).toBe(0);
            expect(noResults.body.recipes).toHaveLength(0);
        });
    });

    describe('normalizeDispatchedRecipe', () => {
        const sampleJsonRecipe = {
            dispatch: {
                status: 'parsed',
                handler: 'json-crafting-handler',
                result: {
                    recipeType: '<recipetype:create:pressing>',
                    recipeId: 'create:press_brass',
                    data: {
                        item_inputs: [{ item: '<item:create:plate>', amount: 2 }],
                        item_outputs: [{ item: '<item:create:pressed_plate>', amount: 1 }]
                    }
                }
            }
        };

        test('handles json handler', () => {
            const normalized = serverModule.normalizeDispatchedRecipe(sampleJsonRecipe);

            expect(normalized).toBeTruthy();
            expect(normalized.format).toBe('addJsonRecipe');
            expect(normalized.mod).toBe('create');
            expect(normalized.inputs.items).toEqual([{ item: '<item:create:plate>', amount: 2 }]);
        });

        test('handles shaped and shapeless handlers', () => {
            const shaped = serverModule.normalizeDispatchedRecipe({
                dispatch: {
                    status: 'parsed',
                    handler: 'shaped-crafting-handler',
                    result: {
                        pattern: '<item:minecraft:stick> <item:minecraft:stick>',
                        output: '<item:create:shaft>'
                    }
                },
                recipeType: '<recipetype:create:pressing>'
            });

            const shapeless = serverModule.normalizeDispatchedRecipe({
                dispatch: {
                    status: 'parsed',
                    handler: 'shapeless-crafting-handler',
                    result: {
                        ingredients: '<item:minecraft:stick> <item:minecraft:flint>',
                        output: '<item:create:flint_knife>'
                    }
                },
                recipeType: '<recipetype:create:pressing>'
            });

            expect(shaped.format).toBe('addShaped');
            expect(shapeless.format).toBe('addShapeless');
            expect(shapeless.inputs.items).toHaveLength(2);
        });

        test('returns null for unsupported handlers', () => {
            const result = serverModule.normalizeDispatchedRecipe({
                dispatch: { status: 'parsed', handler: 'unknown-handler', result: {} }
            });

            expect(result).toBeNull();
        });
    });
});