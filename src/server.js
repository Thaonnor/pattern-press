const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { segmentLogContent } = require('./log-segmenter');
const { createDefaultDispatcher, processSegments } = require('./parsers');
const {
    normalizeRecipeTypeValue,
    getModFromId,
    getMachineTypeFromRecipeType,
    extractInputs,
    extractOutputs,
    extractCraftingInputs,
    extractCraftingOutputs,
    getRecipeStats
} = require('./utils/recipe-utils');
const { filterAndPaginateRecipes, normalizeFilters, normalizePagination } = require('./utils/recipe-filter-utils');

const app = express();
const PORT = 3000;

/**
 * @typedef {Object} RecipeItem
 * @property {string} item Fully qualified item identifier (e.g. `<item:mod:block>`).
 * @property {number} [amount] Stack size associated with the item entry.
 */

/**
 * @typedef {Object} RecipeFluid
 * @property {string} [fluid] Fluid identifier reported by CraftTweaker.
 * @property {string} [id] Alternative fluid identifier field present in some handlers.
 * @property {number} [amount] Amount in millibuckets or the unit reported by the handler.
 */

/**
 * @typedef {Object} RecipeIO
 * @property {RecipeItem[]} items Normalized item inputs or outputs.
 * @property {RecipeFluid[]} fluids Normalized fluid inputs or outputs.
 */

/**
 * @typedef {Object} NormalizedRecipe
 * @property {string} type Normalized recipe type (namespace-qualified).
 * @property {string} name Recipe identifier/name within the log.
 * @property {string} mod Source mod derived from the recipe identifier namespace.
 * @property {string} machineType Simplified machine or crafting category display label.
 * @property {string} format Handler identifier describing how the recipe was produced.
 * @property {Object} data Raw handler payload used for detailed rendering in the UI.
 * @property {RecipeIO} inputs Structured recipe inputs extracted from the handler payload.
 * @property {RecipeIO} outputs Structured recipe outputs extracted from the handler payload.
 */

/**
 * @typedef {Object} RecipeStats
 * @property {number} total Total number of parsed recipes.
 * @property {Record<string, number>} byType Aggregate counts keyed by recipe type.
 * @property {Record<string, number>} byMod Aggregate counts keyed by originating mod id.
 * @property {Record<string, number>} byFormat Aggregate counts keyed by handler/format id.
 */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

/** @type {NormalizedRecipe[]} */
let parsedRecipes = [];

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
 * Accepts CraftTweaker log uploads, runs the parsing pipeline, and caches the results.
 *
 * @param {import('express').Request} req Express request containing the uploaded log file.
 * @param {import('express').Response} res Express response used to return parsing feedback.
 * @returns {Promise<void>} Resolves when the response has been sent.
 */
app.post('/upload', upload.single('logFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const logContent = req.file.buffer.toString('utf-8');
        const recipes = await parseRecipeLog(logContent);

        parsedRecipes = recipes;

        const stats = getRecipeStats(recipes);

        res.json({
            success: true,
            message: `Parsed ${recipes.length} recipes`,
            stats: stats
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'Error processing file: ' + error.message });
    }
});

/**
 * Returns a filtered/paginated slice of the cached recipe collection for the UI.
 *
 * @param {import('express').Request} req Request containing optional filter and paging parameters.
 * @param {import('express').Response} res Response used to send the filtered recipe payload.
 */
app.get('/recipes', (req, res) => {
    const filters = normalizeFilters(req.query);
    const pagination = normalizePagination(req.query);

    const result = filterAndPaginateRecipes(parsedRecipes, filters, pagination);

    res.json({
        recipes: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
    });
});

/**
 * Exposes aggregate statistics for the currently cached recipe set.
 *
 * @param {import('express').Request} req Incoming HTTP request (unused).
 * @param {import('express').Response} res Response used to return aggregate statistics.
 */
app.get('/stats', (req, res) => {
    const stats = getRecipeStats(parsedRecipes);
    res.json(stats);
});

/**
 * Parses the raw CraftTweaker log content into normalized recipe summaries.
 *
 * @param {string} logContent Full text contents of a CraftTweaker log file.
 * @returns {Promise<NormalizedRecipe[]>} Normalized recipes ready for client consumption.
 */
async function parseRecipeLog(logContent) {
    console.log(`Processing file of ${logContent.length} characters`);

    const segments = segmentLogContent(logContent);
    console.log(`Segmented ${segments.length} potential recipe statements`);

    const dispatcher = createDefaultDispatcher({ logger: console });
    const processedSegments = await processSegments(dispatcher, segments);

    const recipes = [];

    processedSegments.forEach((entry) => {
        const { dispatch } = entry;

        if (dispatch.status === 'parsed') {
            const normalized = normalizeDispatchedRecipe(entry);
            if (normalized) {
                recipes.push(normalized);
            }
        } else if (dispatch.status === 'error') {
            console.warn(`Failed to parse segment at lines ${entry.startLine}-${entry.endLine}: ${dispatch.error}`);
        } else {
            console.warn(`Unhandled segment at lines ${entry.startLine}-${entry.endLine}`);
        }
    });

    console.log(`Successfully parsed ${recipes.length} out of ${processedSegments.length} segmented recipes`);
    return recipes;
}

/**
 * Converts a dispatcher result into the normalized recipe structure consumed by the UI.
 *
 * @param {{dispatch: {status: string, handler?: string, result?: any, error?: string}, recipeType?: string}} entry
 * Dispatch metadata emitted by the parsing pipeline.
 * @returns {NormalizedRecipe|null} Normalized recipe or `null` when conversion is not possible.
 */
function normalizeDispatchedRecipe(entry) {
    const { dispatch, recipeType } = entry;
    const { handler, result } = dispatch;

    if (!result) {
        return null;
    }

    const normalizedType = normalizeRecipeTypeValue(result.recipeType || recipeType) || 'minecraft:crafting';
    const recipeId = result.recipeId || 'unknown';
    const mod = getModFromId(recipeId);
    const machineType = getMachineTypeFromRecipeType(normalizedType);

    switch (handler) {
        case 'json-crafting-handler': {
            const data = result.data || {};
            return {
                type: normalizedType,
                name: recipeId,
                mod,
                machineType,
                format: 'addJsonRecipe',
                data,
                inputs: extractInputs(data),
                outputs: extractOutputs(data)
            };
        }
        case 'shaped-crafting-handler': {
            const pattern = result.pattern || '';
            const output = result.output || '';
            return {
                type: normalizedType,
                name: recipeId,
                mod,
                machineType,
                format: 'addShaped',
                data: {
                    type: 'minecraft:crafting_shaped',
                    output,
                    pattern
                },
                inputs: extractCraftingInputs(pattern),
                outputs: extractCraftingOutputs(output)
            };
        }
        case 'shapeless-crafting-handler': {
            const ingredients = result.ingredients || '';
            const output = result.output || '';
            return {
                type: normalizedType,
                name: recipeId,
                mod,
                machineType,
                format: 'addShapeless',
                data: {
                    type: 'minecraft:crafting_shapeless',
                    output,
                    ingredients
                },
                inputs: extractCraftingInputs(ingredients),
                outputs: extractCraftingOutputs(output)
            };
        }
        default:
            return null;
    }
}


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`CraftTweaker Recipe Parser running at http://localhost:${PORT}`);
    });
}

module.exports = {
    app,
    parseRecipeLog,
    normalizeDispatchedRecipe
};


