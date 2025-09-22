const fs = require('fs');
const path = require('path');

const { RecipeDatabase } = require('../src/recipe-database');

const testDbPath = path.join(__dirname, 'temp-recipe-db.json');

// Helper to clean up test database
function cleanup() {
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
}

describe('RecipeDatabase', () => {
    afterEach(() => {
        cleanup();
    });

    test('creates and loads empty database', async () => {
        cleanup();

        const db = new RecipeDatabase(testDbPath);
        await db.load();

        expect(db.getRecipeCount()).toBe(0);
        expect(db.getAllRecipes()).toEqual([]);
    });

    test('persists and loads recipes', async () => {
        const db = new RecipeDatabase(testDbPath);
        await db.load();

        const recipe = {
            recipeId: 'minecraft:iron_sword',
            recipeType: 'minecraft:crafting',
            format: 'addShaped',
            output: '<item:minecraft:iron_sword>'
        };

        const isNew = db.upsertRecipe(recipe);
        expect(isNew).toBe(true);
        expect(db.getRecipeCount()).toBe(1);

        await db.save();
        expect(fs.existsSync(testDbPath)).toBe(true);

        // Create new instance and load
        const db2 = new RecipeDatabase(testDbPath);
        await db2.load();

        expect(db2.getRecipeCount()).toBe(1);
        const loadedRecipe = db2.getRecipe('minecraft:iron_sword');
        expect(loadedRecipe.recipeId).toBe(recipe.recipeId);
        expect(loadedRecipe.lastSeen).toBeTruthy();
    });

    test('handles upsert correctly', async () => {
        const db = new RecipeDatabase(testDbPath);
        await db.load();

        const recipe = {
            recipeId: 'test:recipe',
            recipeType: 'test:type',
            format: 'test'
        };

        const isNew1 = db.upsertRecipe(recipe);
        expect(isNew1).toBe(true);

        const isNew2 = db.upsertRecipe({ ...recipe, format: 'updated' });
        expect(isNew2).toBe(false);

        expect(db.getRecipeCount()).toBe(1);
        const updated = db.getRecipe('test:recipe');
        expect(updated.format).toBe('updated');
    });

    test('filtering and querying', async () => {
        const db = new RecipeDatabase(testDbPath);
        await db.load();

        db.upsertRecipe({ recipeId: 'minecraft:sword', format: 'addShaped' });
        db.upsertRecipe({ recipeId: 'create:brass', format: 'addJsonRecipe' });
        db.upsertRecipe({ recipeId: 'create:copper', format: 'addJsonRecipe' });

        const shapedRecipes = db.getRecipesByFormat('addShaped');
        expect(shapedRecipes).toHaveLength(1);

        const jsonRecipes = db.getRecipesByFormat('addJsonRecipe');
        expect(jsonRecipes).toHaveLength(2);
    });

    test('bulkUpsert provides statistics', async () => {
        const db = new RecipeDatabase(testDbPath);
        await db.load();

        const recipes = [
            { recipeId: 'recipe1', format: 'test' },
            { recipeId: 'recipe2', format: 'test' },
            { recipeId: 'recipe3', format: 'test' }
        ];

        const stats = await db.bulkUpsert(recipes);
        expect(stats.added).toBe(3);
        expect(stats.updated).toBe(0);
        expect(stats.total).toBe(3);

        // Update one and add one
        const moreRecipes = [
            { recipeId: 'recipe1', format: 'updated' },
            { recipeId: 'recipe4', format: 'new' }
        ];

        const stats2 = await db.bulkUpsert(moreRecipes);
        expect(stats2.added).toBe(1);
        expect(stats2.updated).toBe(1);
        expect(stats2.total).toBe(4);
    });

    test('backup functionality', async () => {
        const db = new RecipeDatabase(testDbPath);
        await db.load();

        db.upsertRecipe({ recipeId: 'test', format: 'test' });
        await db.save();

        const backupPath = await db.backup();
        expect(fs.existsSync(backupPath)).toBe(true);
        expect(backupPath).toMatch(/backup-\d{8}-\d{6}/);

        // Clean up backup
        fs.unlinkSync(backupPath);
    });

    test('validates recipe requirements', () => {
        const db = new RecipeDatabase(':memory:'); // Invalid path, but just testing validation

        expect(() => {
            db.upsertRecipe({ format: 'test' }); // Missing recipeId
        }).toThrow(/Recipe must have a recipeId/);
    });
});