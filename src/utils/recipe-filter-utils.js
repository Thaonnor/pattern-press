'use strict';

/**
 * @typedef {Object} FilterOptions
 * @property {string} [type] Filter by recipe type.
 * @property {string} [mod] Filter by mod namespace.
 * @property {string} [search] Search term for name/content filtering.
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] Page number (1-based).
 * @property {number} [limit=20] Number of items per page.
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} items Filtered and paginated items.
 * @property {number} total Total number of items matching filters.
 * @property {number} page Current page number.
 * @property {number} totalPages Total number of pages.
 */

/**
 * Filters recipes based on provided criteria.
 *
 * @param {Array} recipes Array of recipe objects to filter.
 * @param {FilterOptions} [filters={}] Filter criteria.
 * @returns {Array} Filtered recipes.
 */
function filterRecipes(recipes, filters = {}) {
    const { type, mod, search } = filters;
    let filtered = [...recipes];

    if (type && type !== '') {
        filtered = filtered.filter(recipe => recipe.type === type);
    }

    if (mod && mod !== '') {
        filtered = filtered.filter(recipe => recipe.mod === mod);
    }

    if (search && search !== '') {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(recipe => {
            // Search in recipe name/id
            if (recipe.name && recipe.name.toLowerCase().includes(searchLower)) {
                return true;
            }

            // Search in recipe ID (alternative field name)
            if (recipe.recipeId && recipe.recipeId.toLowerCase().includes(searchLower)) {
                return true;
            }

            // Search in recipe type
            if (recipe.type && recipe.type.toLowerCase().includes(searchLower)) {
                return true;
            }

            // Search in recipe data (JSON content)
            if (recipe.data) {
                try {
                    return JSON.stringify(recipe.data).toLowerCase().includes(searchLower);
                } catch (error) {
                    // Ignore JSON serialization errors
                }
            }

            return false;
        });
    }

    return filtered;
}

/**
 * Applies pagination to a filtered result set.
 *
 * @param {Array} items Array of items to paginate.
 * @param {PaginationOptions} [pagination={}] Pagination options.
 * @returns {PaginatedResult} Paginated result with metadata.
 */
function paginateResults(items, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
        items: paginatedItems,
        total: items.length,
        page: pageNum,
        totalPages: Math.ceil(items.length / limitNum)
    };
}

/**
 * Combines filtering and pagination into a single operation.
 *
 * @param {Array} recipes Array of recipe objects.
 * @param {FilterOptions} [filters={}] Filter criteria.
 * @param {PaginationOptions} [pagination={}] Pagination options.
 * @returns {PaginatedResult} Filtered and paginated results.
 */
function filterAndPaginateRecipes(recipes, filters = {}, pagination = {}) {
    const filtered = filterRecipes(recipes, filters);
    return paginateResults(filtered, pagination);
}

/**
 * Searches recipes by multiple criteria with relevance scoring.
 *
 * @param {Array} recipes Array of recipe objects to search.
 * @param {string} query Search query string.
 * @param {Object} [options={}] Search options.
 * @param {number} [options.minScore=0] Minimum relevance score to include.
 * @returns {Array} Search results with relevance scores.
 */
function searchRecipes(recipes, query, options = {}) {
    const { minScore = 0 } = options;

    if (!query || query.trim() === '') {
        return recipes.map(recipe => ({ recipe, score: 1 }));
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    const results = recipes.map(recipe => {
        let score = 0;

        // Score based on recipe name/ID matches
        const recipeName = (recipe.name || recipe.recipeId || '').toLowerCase();
        searchTerms.forEach(term => {
            if (recipeName.includes(term)) {
                score += recipeName === term ? 10 : (recipeName.startsWith(term) ? 5 : 2);
            }
        });

        // Score based on type matches
        const recipeType = (recipe.type || '').toLowerCase();
        searchTerms.forEach(term => {
            if (recipeType.includes(term)) {
                score += 3;
            }
        });

        // Score based on mod matches
        const recipeMod = (recipe.mod || '').toLowerCase();
        searchTerms.forEach(term => {
            if (recipeMod.includes(term)) {
                score += 2;
            }
        });

        // Score based on data content (lower weight)
        if (recipe.data) {
            try {
                const dataContent = JSON.stringify(recipe.data).toLowerCase();
                searchTerms.forEach(term => {
                    if (dataContent.includes(term)) {
                        score += 1;
                    }
                });
            } catch (error) {
                // Ignore JSON serialization errors
            }
        }

        return { recipe, score };
    });

    return results
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score);
}

/**
 * Groups recipes by a specified field.
 *
 * @param {Array} recipes Array of recipe objects.
 * @param {string} groupBy Field name to group by (e.g., 'type', 'mod').
 * @returns {Record<string, Array>} Recipes grouped by the specified field.
 */
function groupRecipes(recipes, groupBy) {
    const groups = {};

    recipes.forEach(recipe => {
        const groupValue = recipe[groupBy] || 'unknown';
        if (!groups[groupValue]) {
            groups[groupValue] = [];
        }
        groups[groupValue].push(recipe);
    });

    return groups;
}

/**
 * Validates filter options and converts string values to appropriate types.
 *
 * @param {Object} rawFilters Raw filter parameters (e.g., from URL query).
 * @returns {FilterOptions} Validated and normalized filter options.
 */
function normalizeFilters(rawFilters) {
    const filters = {};

    if (rawFilters.type && typeof rawFilters.type === 'string' && rawFilters.type.trim()) {
        filters.type = rawFilters.type.trim();
    }

    if (rawFilters.mod && typeof rawFilters.mod === 'string' && rawFilters.mod.trim()) {
        filters.mod = rawFilters.mod.trim();
    }

    if (rawFilters.search && typeof rawFilters.search === 'string' && rawFilters.search.trim()) {
        filters.search = rawFilters.search.trim();
    }

    return filters;
}

/**
 * Validates pagination options and provides safe defaults.
 *
 * @param {Object} rawPagination Raw pagination parameters (e.g., from URL query).
 * @returns {PaginationOptions} Validated pagination options.
 */
function normalizePagination(rawPagination) {
    const pagination = {};

    if (rawPagination.page) {
        const page = parseInt(rawPagination.page, 10);
        pagination.page = isNaN(page) || page < 1 ? 1 : page;
    }

    if (rawPagination.limit) {
        const limit = parseInt(rawPagination.limit, 10);
        pagination.limit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100); // Cap at 100
    }

    return pagination;
}

module.exports = {
    filterRecipes,
    paginateResults,
    filterAndPaginateRecipes,
    searchRecipes,
    groupRecipes,
    normalizeFilters,
    normalizePagination
};