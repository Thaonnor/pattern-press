'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDirectoryExists, writeJsonFile, readJsonFile, timestampSlug } = require('./utils/file-utils');

/**
 * @typedef {Object} RecipeEntry
 * @property {string} recipeId Recipe identifier (used as key)
 * @property {string|null} recipeType CraftTweaker recipe type
 * @property {string} format Handler format identifier
 * @property {string} lastSeen ISO timestamp of when recipe was last processed
 * @property {...*} Additional fields specific to recipe type (output, input, experience, etc.)
 */

/**
 * Persistent recipe database using recipe IDs as unique keys.
 * Allows accumulation of recipes across multiple log processing runs
 * without duplication while preserving type-specific fields.
 */
class RecipeDatabase {
    /**
     * Creates a new recipe database instance.
     * @param {string} [filePath='data/recipe-database.json'] Path to the database file
     */
    constructor(filePath = 'data/recipe-database.json') {
        this.filePath = path.resolve(filePath);
        this.recipes = new Map();
        this._ensureDataDirectory();
    }

    /**
     * Ensures the data directory exists for the database file.
     * @private
     */
    _ensureDataDirectory() {
        const dir = path.dirname(this.filePath);
        ensureDirectoryExists(dir);
    }

    /**
     * Loads existing recipes from the database file.
     * Creates an empty database if the file doesn't exist.
     * @returns {Promise<void>}
     */
    async load() {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.recipes.clear();
                return;
            }

            const parsed = readJsonFile(this.filePath);

            this.recipes.clear();
            for (const [recipeId, recipe] of Object.entries(parsed)) {
                this.recipes.set(recipeId, recipe);
            }
        } catch (error) {
            throw new Error(`Failed to load recipe database: ${error.message}`);
        }
    }

    /**
     * Saves the current recipes to the database file.
     * @returns {Promise<void>}
     */
    async save() {
        try {
            const data = Object.fromEntries(this.recipes);
            writeJsonFile(this.filePath, data);
        } catch (error) {
            throw new Error(`Failed to save recipe database: ${error.message}`);
        }
    }

    /**
     * Adds or updates a recipe in the database.
     * @param {RecipeEntry} recipe Recipe data with recipeId and other fields
     * @returns {boolean} True if recipe was added, false if updated
     */
    upsertRecipe(recipe) {
        if (!recipe.recipeId) {
            throw new Error('Recipe must have a recipeId');
        }

        const isNew = !this.recipes.has(recipe.recipeId);

        // Add lastSeen timestamp
        const recipeWithTimestamp = {
            ...recipe,
            lastSeen: new Date().toISOString()
        };

        this.recipes.set(recipe.recipeId, recipeWithTimestamp);
        return isNew;
    }

    /**
     * Gets a recipe by its ID.
     * @param {string} recipeId Recipe identifier
     * @returns {RecipeEntry|undefined} Recipe data or undefined if not found
     */
    getRecipe(recipeId) {
        return this.recipes.get(recipeId);
    }

    /**
     * Gets all recipes as an array.
     * @returns {RecipeEntry[]} Array of all recipes
     */
    getAllRecipes() {
        return Array.from(this.recipes.values());
    }

    /**
     * Gets recipes filtered by format type.
     * @param {string} format Format identifier (e.g., 'addShaped', 'addBlastFurnace')
     * @returns {RecipeEntry[]} Array of matching recipes
     */
    getRecipesByFormat(format) {
        return this.getAllRecipes().filter(recipe => recipe.format === format);
    }

    /**
     * Gets the total count of recipes in the database.
     * @returns {number} Number of recipes
     */
    getRecipeCount() {
        return this.recipes.size;
    }

    /**
     * Processes an array of parsed recipes and updates the database.
     * @param {RecipeEntry[]} newRecipes Array of recipes to add/update
     * @returns {Promise<{added: number, updated: number, total: number}>} Processing statistics
     */
    async bulkUpsert(newRecipes) {
        let added = 0;
        let updated = 0;

        for (const recipe of newRecipes) {
            if (this.upsertRecipe(recipe)) {
                added++;
            } else {
                updated++;
            }
        }

        await this.save();

        return {
            added,
            updated,
            total: this.getRecipeCount()
        };
    }

    /**
     * Creates a backup of the current database file.
     * @returns {Promise<string>} Path to the backup file
     */
    async backup() {
        const timestamp = timestampSlug();
        const backupPath = this.filePath.replace('.json', `-backup-${timestamp}.json`);

        if (fs.existsSync(this.filePath)) {
            fs.copyFileSync(this.filePath, backupPath);
        }

        return backupPath;
    }
}

module.exports = {
    RecipeDatabase
};