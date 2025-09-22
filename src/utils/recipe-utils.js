'use strict';

/**
 * @typedef {Object} RecipeStats
 * @property {number} total Total number of recipes.
 * @property {Record<string, number>} byType Aggregate counts keyed by recipe type.
 * @property {Record<string, number>} byMod Aggregate counts keyed by mod.
 */


/**
 * Derives the source mod namespace from a recipe identifier.
 *
 * @param {string} recipeId Recipe identifier in `namespace:path` format.
 * @returns {string} Mod namespace or `minecraft` when the namespace is missing/unknown.
 */
function getModFromId(recipeId) {
    if (!recipeId || typeof recipeId !== 'string') {
        return 'minecraft';
    }

    if (!recipeId.includes(':')) {
        return 'minecraft';
    }

    return recipeId.split(':')[0];
}



/**
 * Aggregates summary statistics for the recipe collection used by the UI filters.
 *
 * @param {Array} recipes Recipe collection.
 * @returns {RecipeStats} Aggregate counts by type and mod.
 */
function getRecipeStats(recipes) {
    const stats = {
        total: recipes.length,
        byType: {},
        byMod: {}
    };

    recipes.forEach(recipe => {
        // Count by type
        if (recipe.type) {
            stats.byType[recipe.type] = (stats.byType[recipe.type] || 0) + 1;
        }

        // Count by mod
        if (recipe.mod) {
            stats.byMod[recipe.mod] = (stats.byMod[recipe.mod] || 0) + 1;
        }
    });

    return stats;
}

module.exports = {
    getModFromId,
    getRecipeStats
};