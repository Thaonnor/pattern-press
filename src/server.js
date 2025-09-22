const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { getRecipeStats } = require('./utils/recipe-utils');
const { filterAndPaginateRecipes, normalizeFilters, normalizePagination } = require('./utils/recipe-filter-utils');

const app = express();
const PORT = 3000;

/**
 * @typedef {Object} Recipe
 * @property {string} _id NeDB document ID.
 * @property {string} id Recipe identifier.
 * @property {string} mod Source mod.
 * @property {string} type Recipe type.
 * @property {string} name Recipe name.
 * @property {Object} data Raw recipe JSON data.
 */

/**
 * @typedef {Object} RecipeStats
 * @property {number} total Total number of recipes.
 * @property {Record<string, number>} byType Aggregate counts keyed by recipe type.
 * @property {Record<string, number>} byMod Aggregate counts keyed by mod.
 */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));


/**
 * Serves the front-end single page application shell.
 *
 * @param {import('express').Request} req Incoming HTTP request.
 * @param {import('express').Response} res Express response used to return the HTML shell.
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


/**
 * Returns a filtered/paginated slice of recipes from the database.
 *
 * @param {import('express').Request} req Request containing optional filter and paging parameters.
 * @param {import('express').Response} res Response used to send the filtered recipe payload.
 */
app.get('/recipes', async (req, res) => {
    try {
        const filters = normalizeFilters(req.query);
        const pagination = normalizePagination(req.query);

        // Build NeDB query from filters
        const query = {};
        if (filters.mod) {
            query.mod = filters.mod;
        }
        if (filters.type) {
            query.type = filters.type;
        }
        if (filters.search) {
            query.name = new RegExp(filters.search, 'i');
        }

        // Get total count for pagination
        const total = await new Promise((resolve, reject) => {
            db.count(query, (err, count) => {
                if (err) reject(err);
                else resolve(count);
            });
        });

        // Get paginated results
        const recipes = await new Promise((resolve, reject) => {
            db.find(query)
                .skip(pagination.offset)
                .limit(pagination.limit)
                .exec((err, docs) => {
                    if (err) reject(err);
                    else resolve(docs);
                });
        });

        const totalPages = Math.ceil(total / pagination.limit);

        res.json({
            recipes,
            total,
            page: pagination.page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Error fetching recipes: ' + error.message });
    }
});

/**
 * Exposes aggregate statistics for recipes in the database.
 *
 * @param {import('express').Request} req Incoming HTTP request (unused).
 * @param {import('express').Response} res Response used to return aggregate statistics.
 */
app.get('/stats', async (req, res) => {
    try {
        // Get all recipes for stats calculation
        const recipes = await new Promise((resolve, reject) => {
            db.find({}, (err, docs) => {
                if (err) reject(err);
                else resolve(docs);
            });
        });

        const stats = {
            total: recipes.length,
            byType: {},
            byMod: {}
        };

        // Calculate stats
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

        res.json(stats);
    } catch (error) {
        console.error('Error calculating stats:', error);
        res.status(500).json({ error: 'Error calculating stats: ' + error.message });
    }
});



if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Pattern Press running at http://localhost:${PORT}`);
    });
}

module.exports = {
    app
};


