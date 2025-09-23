'use strict';

const fs = require('fs');
const path = require('path');
const RecipeLoader = require('../src/recipe-loader');

describe('recipe-loader.js', () => {
    let recipeLoader;
    const testDataDir = path.join(__dirname, 'temp-recipes');

    beforeEach(() => {
        // Clean up test directory
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }

        // Create test data directory
        fs.mkdirSync(testDataDir, { recursive: true });

        // Mock the data directory
        recipeLoader = new RecipeLoader();
        recipeLoader.dataDir = testDataDir;
    });

    afterEach(() => {
        // Clean up
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('getAvailableMods', () => {
        it('should return empty array when no recipe files exist', () => {
            const result = recipeLoader.getAvailableMods();
            expect(result).toEqual([]);
        });

        it('should return list of mod names from JSON files', () => {
            // Create test recipe files
            fs.writeFileSync(path.join(testDataDir, 'minecraft.json'), '[]');
            fs.writeFileSync(path.join(testDataDir, 'mekanism.json'), '[]');
            fs.writeFileSync(path.join(testDataDir, 'not-json.txt'), 'ignored');

            const result = recipeLoader.getAvailableMods();

            expect(result).toEqual(['mekanism', 'minecraft']);
        });

        it('should handle non-existent data directory', () => {
            recipeLoader.dataDir = '/non/existent/path';
            const result = recipeLoader.getAvailableMods();
            expect(result).toEqual([]);
        });
    });

    describe('loadMod', () => {
        it('should load recipes for existing mod', () => {
            const testRecipes = [
                { id: 'test1', mod: 'minecraft', type: 'crafting' },
                { id: 'test2', mod: 'minecraft', type: 'smelting' }
            ];

            fs.writeFileSync(
                path.join(testDataDir, 'minecraft.json'),
                JSON.stringify(testRecipes, null, 2)
            );

            const result = recipeLoader.loadMod('minecraft');

            expect(result).toEqual(testRecipes);
        });

        it('should cache loaded recipes', () => {
            const testRecipes = [{ id: 'test', mod: 'minecraft' }];

            fs.writeFileSync(
                path.join(testDataDir, 'minecraft.json'),
                JSON.stringify(testRecipes)
            );

            // First load
            const result1 = recipeLoader.loadMod('minecraft');

            // Modify file after first load
            fs.writeFileSync(
                path.join(testDataDir, 'minecraft.json'),
                JSON.stringify([{ id: 'modified' }])
            );

            // Second load should return cached version
            const result2 = recipeLoader.loadMod('minecraft');

            expect(result1).toEqual(result2);
            expect(result2).toEqual(testRecipes);
        });

        it('should return empty array for non-existent mod', () => {
            const result = recipeLoader.loadMod('nonexistent');
            expect(result).toEqual([]);
        });

        it('should handle malformed JSON gracefully', () => {
            fs.writeFileSync(path.join(testDataDir, 'broken.json'), 'invalid json');

            const result = recipeLoader.loadMod('broken');

            expect(result).toEqual([]);
        });
    });

    describe('loadAllRecipes', () => {
        it('should load recipes from all mods', () => {
            const minecraftRecipes = [{ id: 'mc1', mod: 'minecraft' }];
            const mekanismRecipes = [{ id: 'mek1', mod: 'mekanism' }];

            fs.writeFileSync(
                path.join(testDataDir, 'minecraft.json'),
                JSON.stringify(minecraftRecipes)
            );
            fs.writeFileSync(
                path.join(testDataDir, 'mekanism.json'),
                JSON.stringify(mekanismRecipes)
            );

            const result = recipeLoader.loadAllRecipes();

            expect(result).toHaveLength(2);
            expect(result).toContainEqual({ id: 'mc1', mod: 'minecraft' });
            expect(result).toContainEqual({ id: 'mek1', mod: 'mekanism' });
        });

        it('should return empty array when no recipes exist', () => {
            const result = recipeLoader.loadAllRecipes();
            expect(result).toEqual([]);
        });
    });

    describe('filterRecipes', () => {
        const testRecipes = [
            { id: 'boat1', mod: 'minecraft', type: 'minecraft:crafting_shaped', name: 'acacia_boat' },
            { id: 'boat2', mod: 'minecraft', type: 'minecraft:crafting_shapeless', name: 'chest_boat' },
            { id: 'sword', mod: 'minecraft', type: 'minecraft:crafting_shaped', name: 'iron_sword' },
            { id: 'chem1', mod: 'mekanism', type: 'mekanism:chemical', name: 'hydrogen' }
        ];

        it('should filter by mod', () => {
            const result = recipeLoader.filterRecipes(testRecipes, { mod: 'minecraft' });

            expect(result).toHaveLength(3);
            expect(result.every(r => r.mod === 'minecraft')).toBe(true);
        });

        it('should filter by type', () => {
            const result = recipeLoader.filterRecipes(testRecipes, { type: 'minecraft:crafting_shaped' });

            expect(result).toHaveLength(2);
            expect(result.every(r => r.type === 'minecraft:crafting_shaped')).toBe(true);
        });

        it('should filter by search term', () => {
            const result = recipeLoader.filterRecipes(testRecipes, { search: 'boat' });

            expect(result).toHaveLength(2);
            expect(result.every(r => r.name.includes('boat'))).toBe(true);
        });

        it('should apply multiple filters', () => {
            const result = recipeLoader.filterRecipes(testRecipes, {
                mod: 'minecraft',
                type: 'minecraft:crafting_shaped',
                search: 'boat'
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('boat1');
        });

        it('should be case insensitive for search', () => {
            const result = recipeLoader.filterRecipes(testRecipes, { search: 'BOAT' });

            expect(result).toHaveLength(2);
        });

        it('should return all recipes when no filters applied', () => {
            const result = recipeLoader.filterRecipes(testRecipes, {});

            expect(result).toEqual(testRecipes);
        });
    });

    describe('paginate', () => {
        const testRecipes = Array.from({ length: 25 }, (_, i) => ({ id: `recipe${i}` }));

        it('should paginate results correctly', () => {
            const result = recipeLoader.paginate(testRecipes, 1, 10);

            expect(result.recipes).toHaveLength(10);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNext: true,
                hasPrev: false
            });
        });

        it('should handle last page correctly', () => {
            const result = recipeLoader.paginate(testRecipes, 3, 10);

            expect(result.recipes).toHaveLength(5);
            expect(result.pagination.hasNext).toBe(false);
            expect(result.pagination.hasPrev).toBe(true);
        });

        it('should handle page beyond total pages', () => {
            const result = recipeLoader.paginate(testRecipes, 10, 10);

            expect(result.recipes).toHaveLength(0);
            expect(result.pagination.page).toBe(10);
        });

        it('should use default pagination values', () => {
            const result = recipeLoader.paginate(testRecipes);

            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(20);
        });
    });

    describe('getStats', () => {
        it('should generate correct statistics', () => {
            const testRecipes = [
                { mod: 'minecraft', type: 'minecraft:crafting_shaped' },
                { mod: 'minecraft', type: 'minecraft:crafting_shaped' },
                { mod: 'minecraft', type: 'minecraft:smelting' },
                { mod: 'mekanism', type: 'mekanism:chemical' }
            ];

            // Mock loadAllRecipes to return test data
            jest.spyOn(recipeLoader, 'loadAllRecipes').mockReturnValue(testRecipes);

            const result = recipeLoader.getStats();

            expect(result.total).toBe(4);
            expect(result.byMod).toEqual({
                minecraft: 3,
                mekanism: 1
            });
            expect(result.byType).toEqual({
                'minecraft:crafting_shaped': 2,
                'minecraft:smelting': 1,
                'mekanism:chemical': 1
            });
            expect(result.mods).toEqual([]);
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', () => {
            const testRecipes = [{ id: 'test' }];

            fs.writeFileSync(
                path.join(testDataDir, 'minecraft.json'),
                JSON.stringify(testRecipes)
            );

            // Load to populate cache
            recipeLoader.loadMod('minecraft');

            // Modify file
            fs.writeFileSync(
                path.join(testDataDir, 'minecraft.json'),
                JSON.stringify([{ id: 'modified' }])
            );

            // Clear cache
            recipeLoader.clearCache();

            // Load again should return new data
            const result = recipeLoader.loadMod('minecraft');

            expect(result).toEqual([{ id: 'modified' }]);
        });
    });
});