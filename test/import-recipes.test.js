'use strict';

const fs = require('fs');
const path = require('path');
const { importRecipes } = require('../src/import-recipes');

// Mock the utils module
jest.mock('../src/utils', () => ({
    findJsonFiles: jest.fn(),
    readJsonFile: jest.fn(),
    ensureDirectoryExists: jest.fn(),
    writeJsonFile: jest.fn(),
    loadImportConfig: jest.fn()
}));

const mockUtils = require('../src/utils');

describe('import-recipes.js', () => {
    const testInputPath = '/test/input/path';
    const mockConfig = {
        mods: ['minecraft'],
        ignoredMods: [],
        recipeTypes: ['minecraft:crafting_shaped', 'minecraft:crafting_shapeless', 'minecraft:smelting'],
        ignoredRecipeTypes: [],
        logging: {
            logSkipped: true,
            logUnsupportedMods: true,
            logUnsupportedTypes: true
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        mockUtils.loadImportConfig.mockReturnValue(mockConfig);
        mockUtils.ensureDirectoryExists.mockImplementation(() => {});
        mockUtils.writeJsonFile.mockImplementation(() => {});

        // Mock console methods to avoid test output noise
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('importRecipes', () => {
        it('should import supported recipes successfully', async () => {
            const mockFiles = [
                '/test/recipes/minecraft/acacia_boat.json',
                '/test/recipes/minecraft/iron_sword.json'
            ];

            const mockRecipes = [
                { type: 'minecraft:crafting_shaped', result: { id: 'minecraft:acacia_boat' } },
                { type: 'minecraft:crafting_shaped', result: { id: 'minecraft:iron_sword' } }
            ];

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile
                .mockReturnValueOnce(mockRecipes[0])
                .mockReturnValueOnce(mockRecipes[1]);

            const result = await importRecipes(testInputPath);

            expect(result.total).toBe(2);
            expect(result.imported).toBe(2);
            expect(result.skipped).toBe(0);
            expect(result.errors).toBe(0);
            expect(result.byMod.minecraft).toBe(2);

            // Verify writeJsonFile was called
            expect(mockUtils.writeJsonFile).toHaveBeenCalledTimes(1);

            const writeCall = mockUtils.writeJsonFile.mock.calls[0];
            expect(writeCall[1]).toHaveLength(2); // Should have 2 recipes
            expect(writeCall[1][0]).toMatchObject({
                id: 'acacia_boat',
                mod: 'minecraft',
                type: 'minecraft:crafting_shaped'
            });
        });

        it('should skip unsupported mods', async () => {
            const mockFiles = [
                '/test/recipes/create/mixer.json',
                '/test/recipes/minecraft/boat.json'
            ];

            const mockRecipes = [
                { type: 'create:mixing' },
                { type: 'minecraft:crafting_shaped' }
            ];

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile
                .mockReturnValueOnce(mockRecipes[0])
                .mockReturnValueOnce(mockRecipes[1]);

            const result = await importRecipes(testInputPath);

            expect(result.total).toBe(2);
            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(1);
            expect(result.skippedMods.has('create')).toBe(true);
            expect(result.byMod.minecraft).toBe(1);
        });

        it('should skip unsupported recipe types', async () => {
            const mockFiles = [
                '/test/recipes/minecraft/stonecutting.json',
                '/test/recipes/minecraft/crafting.json'
            ];

            const mockRecipes = [
                { type: 'minecraft:stonecutting' },
                { type: 'minecraft:crafting_shaped' }
            ];

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile
                .mockReturnValueOnce(mockRecipes[0])
                .mockReturnValueOnce(mockRecipes[1]);

            const result = await importRecipes(testInputPath);

            expect(result.total).toBe(2);
            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(1);
            expect(result.skippedTypes.has('minecraft:minecraft:stonecutting')).toBe(true);
        });

        it('should handle JSON parsing errors', async () => {
            const mockFiles = ['/test/recipes/minecraft/broken.json'];

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile.mockImplementation(() => {
                throw new Error('Invalid JSON');
            });

            const result = await importRecipes(testInputPath);

            // Total should be 0 because error happens before stats.total++ in the try block
            expect(result.total).toBe(0);
            expect(result.imported).toBe(0);
            expect(result.errors).toBe(1);
        });

        it('should extract mod namespace from file path', async () => {
            const mockFiles = ['/test/export/recipes/mekanism/chemical.json'];
            const mockRecipe = { type: 'mekanism:chemical_conversion' };

            // Add mekanism to config for this test
            const configWithMekanism = {
                ...mockConfig,
                mods: [...mockConfig.mods, 'mekanism'],
                recipeTypes: [...mockConfig.recipeTypes, 'mekanism:*']
            };
            mockUtils.loadImportConfig.mockReturnValue(configWithMekanism);

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile.mockReturnValue(mockRecipe);

            const result = await importRecipes(testInputPath);

            expect(result.byMod.mekanism).toBe(1);

            const writeCall = mockUtils.writeJsonFile.mock.calls[0];
            expect(writeCall[1][0].mod).toBe('mekanism');
        });

        it('should support wildcard recipe types', async () => {
            const mockFiles = ['/test/recipes/mekanism/chemical.json'];
            const mockRecipe = { type: 'mekanism:chemical_conversion' };

            // Config with wildcard support
            const configWithWildcard = {
                ...mockConfig,
                mods: [...mockConfig.mods, 'mekanism'],
                recipeTypes: [...mockConfig.recipeTypes, 'mekanism:*']
            };
            mockUtils.loadImportConfig.mockReturnValue(configWithWildcard);

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile.mockReturnValue(mockRecipe);

            const result = await importRecipes(testInputPath);

            expect(result.imported).toBe(1);
            expect(result.byMod.mekanism).toBe(1);
        });

        it('should create recipe objects with correct structure', async () => {
            const mockFiles = ['/test/recipes/minecraft/test.json'];
            const mockRecipe = {
                type: 'minecraft:crafting_shaped',
                result: { id: 'minecraft:test_item' }
            };

            mockUtils.findJsonFiles.mockReturnValue(mockFiles);
            mockUtils.readJsonFile.mockReturnValue(mockRecipe);

            await importRecipes(testInputPath);

            const writeCall = mockUtils.writeJsonFile.mock.calls[0];
            const savedRecipe = writeCall[1][0];

            expect(savedRecipe).toMatchObject({
                id: 'test',
                mod: 'minecraft',
                type: 'minecraft:crafting_shaped',
                name: 'test',
                data: mockRecipe
            });
            expect(savedRecipe.imported_at).toBeInstanceOf(Date);
        });

        it('should handle directory scanning failures', async () => {
            mockUtils.findJsonFiles.mockImplementation(() => {
                throw new Error('Cannot access directory');
            });

            await expect(importRecipes(testInputPath)).rejects.toThrow('Cannot access directory');
        });

        it('should load configuration on startup', async () => {
            mockUtils.findJsonFiles.mockReturnValue([]);

            await importRecipes(testInputPath);

            expect(mockUtils.loadImportConfig).toHaveBeenCalledTimes(1);
        });

        it('should ensure output directory exists', async () => {
            mockUtils.findJsonFiles.mockReturnValue([]);

            await importRecipes(testInputPath);

            expect(mockUtils.ensureDirectoryExists).toHaveBeenCalledWith(
                expect.stringMatching(/data[\/\\]recipes$/)
            );
        });
    });
});