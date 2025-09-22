const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');\nconst { segmentLogContent } = require('./log-segmenter');\nconst { createDefaultDispatcher, processSegments } = require('./parsers');

const app = express();
const PORT = 3000;

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

let parsedRecipes = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

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

app.get('/recipes', (req, res) => {
    const { type, mod, search, page = 1, limit = 20 } = req.query;

    let filteredRecipes = [...parsedRecipes];

    if (type && type !== '') {
        filteredRecipes = filteredRecipes.filter(recipe => recipe.type === type);
    }

    if (mod && mod !== '') {
        filteredRecipes = filteredRecipes.filter(recipe => recipe.mod === mod);
    }

    if (search && search !== '') {
        const searchLower = search.toLowerCase();
        filteredRecipes = filteredRecipes.filter(recipe =>
            recipe.name.toLowerCase().includes(searchLower) ||
            recipe.type.toLowerCase().includes(searchLower) ||
            JSON.stringify(recipe.data).toLowerCase().includes(searchLower)
        );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex);

    res.json({
        recipes: paginatedRecipes,
        total: filteredRecipes.length,
        page: parseInt(page),
        totalPages: Math.ceil(filteredRecipes.length / limit)
    });
});

app.get('/stats', (req, res) => {
    const stats = getRecipeStats(parsedRecipes);
    res.json(stats);
});

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

function normalizeRecipeTypeValue(rawType) {
    if (!rawType || typeof rawType !== 'string') {
        return null;
    }

    const withoutBrackets = rawType.replace(/[<>]/g, '');
    if (!withoutBrackets) {
        return null;
    }

    return withoutBrackets.replace(/^recipetype:/, '');
}

function getModFromId(recipeId) {
    if (!recipeId || typeof recipeId !== 'string') {
        return 'minecraft';
    }

    if (!recipeId.includes(':')) {
        return 'minecraft';
    }

    return recipeId.split(':')[0];
}

function getMachineTypeFromRecipeType(recipeType) {
    if (!recipeType || typeof recipeType !== 'string') {
        return 'crafting';
    }

    const parts = recipeType.split(':');
    if (parts.length <= 1) {
        return recipeType;
    }

    return parts.slice(1).join(':');
}
function extractInputs(data) {
    const inputs = {
        items: [],
        fluids: []
    };

    if (data.item_inputs) {
        inputs.items = data.item_inputs;
    }
    if (data.inputs && data.inputs.item) {
        if (Array.isArray(data.inputs.item)) {
            inputs.items = data.inputs.item;
        } else {
            inputs.items = [data.inputs.item];
        }
    }
    if (data.inputs && data.inputs.fluid) {
        if (Array.isArray(data.inputs.fluid)) {
            inputs.fluids = data.inputs.fluid;
        } else {
            inputs.fluids = [data.inputs.fluid];
        }
    }
    if (data.fluid_inputs) {
        inputs.fluids = data.fluid_inputs;
    }

    return inputs;
}

function extractOutputs(data) {
    const outputs = {
        items: [],
        fluids: []
    };

    if (data.item_outputs) {
        outputs.items = data.item_outputs;
    }
    if (data.outputs && data.outputs.item_output) {
        if (Array.isArray(data.outputs.item_output)) {
            outputs.items = data.outputs.item_output;
        } else {
            outputs.items = [data.outputs.item_output];
        }
    }
    if (data.outputs && data.outputs.fluid_output) {
        if (Array.isArray(data.outputs.fluid_output)) {
            outputs.fluids = data.outputs.fluid_output;
        } else {
            outputs.fluids = [data.outputs.fluid_output];
        }
    }
    if (data.fluid_outputs) {
        outputs.fluids = data.fluid_outputs;
    }

    return outputs;
}

function extractCraftingInputs(patternOrIngredients) {
    const inputs = {
        items: [],
        fluids: []
    };

    try {
        // Extract item references from pattern/ingredients string
        const itemPattern = /<(item|tag):[^>]+>/g;
        let match;
        while ((match = itemPattern.exec(patternOrIngredients)) !== null) {
            inputs.items.push({
                item: match[0],
                amount: 1
            });
        }
    } catch (error) {
        console.warn(`Failed to extract crafting inputs: ${error.message}`);
    }

    return inputs;
}

function extractCraftingOutputs(outputItem) {
    const outputs = {
        items: [],
        fluids: []
    };

    try {
        // Extract output item
        const itemMatch = outputItem.match(/<item:([^>]+)>/);
        if (itemMatch) {
            outputs.items.push({
                item: itemMatch[0],
                amount: 1
            });
        }
    } catch (error) {
        console.warn(`Failed to extract crafting outputs: ${error.message}`);
    }

    return outputs;
}

function getRecipeStats(recipes) {
    const stats = {
        total: recipes.length,
        byType: {},
        byMod: {},
        byFormat: {}
    };

    recipes.forEach(recipe => {
        // Count by type
        stats.byType[recipe.type] = (stats.byType[recipe.type] || 0) + 1;

        // Count by mod
        stats.byMod[recipe.mod] = (stats.byMod[recipe.mod] || 0) + 1;

        // Count by format
        stats.byFormat[recipe.format] = (stats.byFormat[recipe.format] || 0) + 1;
    });

    return stats;
}

app.listen(PORT, () => {
    console.log(`CraftTweaker Recipe Parser running at http://localhost:${PORT}`);
});




