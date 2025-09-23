'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonFile } = require('./utils');

class RecipeLoader {
    constructor() {
        this.cache = new Map(); // Cache loaded recipe files
        this.dataDir = path.join(__dirname, '..', 'data', 'recipes');
    }

    /**
     * Gets all available mod files
     */
    getAvailableMods() {
        if (!fs.existsSync(this.dataDir)) {
            return [];
        }

        return fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''))
            .sort();
    }

    /**
     * Loads recipes for a specific mod (with caching)
     */
    loadMod(modName) {
        if (this.cache.has(modName)) {
            return this.cache.get(modName);
        }

        const filePath = path.join(this.dataDir, `${modName}.json`);

        if (!fs.existsSync(filePath)) {
            return [];
        }

        try {
            const recipes = readJsonFile(filePath);
            this.cache.set(modName, recipes);
            return recipes;
        } catch (error) {
            console.error(`Error loading ${modName} recipes: ${error.message}`);
            return [];
        }
    }

    /**
     * Loads all recipes from all mods
     */
    loadAllRecipes() {
        const allRecipes = [];
        const mods = this.getAvailableMods();

        for (const mod of mods) {
            const recipes = this.loadMod(mod);
            allRecipes.push(...recipes);
        }

        return allRecipes;
    }

    /**
     * Filters recipes based on query parameters
     */
    filterRecipes(recipes, filters = {}) {
        let filtered = [...recipes];

        // Filter by mod
        if (filters.mod) {
            filtered = filtered.filter(recipe => recipe.mod === filters.mod);
        }

        // Filter by recipe type
        if (filters.type) {
            filtered = filtered.filter(recipe => recipe.type === filters.type);
        }

        // Search in name/id
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(recipe =>
                recipe.name.toLowerCase().includes(searchLower) ||
                recipe.id.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }

    /**
     * Paginates recipe results
     */
    paginate(recipes, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const paginatedRecipes = recipes.slice(offset, offset + limit);

        return {
            recipes: paginatedRecipes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: recipes.length,
                totalPages: Math.ceil(recipes.length / limit),
                hasNext: offset + limit < recipes.length,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Gets recipe statistics
     */
    getStats() {
        const allRecipes = this.loadAllRecipes();
        const stats = {
            total: allRecipes.length,
            byMod: {},
            byType: {},
            mods: this.getAvailableMods()
        };

        // Count by mod and type
        for (const recipe of allRecipes) {
            // Count by mod
            if (!stats.byMod[recipe.mod]) {
                stats.byMod[recipe.mod] = 0;
            }
            stats.byMod[recipe.mod]++;

            // Count by type
            if (!stats.byType[recipe.type]) {
                stats.byType[recipe.type] = 0;
            }
            stats.byType[recipe.type]++;
        }

        return stats;
    }

    /**
     * Clears the cache (useful for reloading after import)
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = RecipeLoader;