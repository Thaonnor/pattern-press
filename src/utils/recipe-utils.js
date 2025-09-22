'use strict';

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
 * @typedef {Object} RecipeStats
 * @property {number} total Total number of parsed recipes.
 * @property {Record<string, number>} byType Aggregate counts keyed by recipe type.
 * @property {Record<string, number>} byMod Aggregate counts keyed by originating mod id.
 * @property {Record<string, number>} byFormat Aggregate counts keyed by handler/format id.
 */

/**
 * Normalizes CraftTweaker recipe type values by removing wrapper syntax.
 *
 * Converts values like '<recipetype:minecraft:blasting>' to 'minecraft:blasting'
 * for cleaner storage and display.
 *
 * @param {string|null} rawType Raw recipe type from CraftTweaker logs
 * @returns {string|null} Normalized recipe type or null if invalid
 */
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
 * Maps a full recipe type identifier to a simplified machine/category label.
 *
 * @param {string} recipeType Recipe type identifier such as `modid:machine`.
 * @returns {string} Simplified machine or category identifier used by the UI.
 */
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

/**
 * Extracts normalized input data from handler payloads that follow the JSON recipe shape.
 *
 * @param {Object} data Handler payload describing inputs for the recipe.
 * @returns {RecipeIO} Normalized input structure broken out by items and fluids.
 */
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

/**
 * Extracts normalized output data from handler payloads that follow the JSON recipe shape.
 *
 * @param {Object} data Handler payload describing outputs for the recipe.
 * @returns {RecipeIO} Normalized output structure broken out by items and fluids.
 */
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

/**
 * Parses shaped/shapeless handler data to approximate input stacks referenced in the script.
 *
 * @param {string} patternOrIngredients Raw pattern or ingredient expression from the handler.
 * @returns {RecipeIO} Normalized inputs with any detected item references.
 */
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

/**
 * Parses crafting handler output strings to extract the resulting item stack.
 *
 * @param {string} outputItem Raw output expression from the handler.
 * @returns {RecipeIO} Normalized outputs with the detected crafted item.
 */
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

/**
 * Aggregates summary statistics for the parsed recipe collection used by the UI filters.
 *
 * @param {Array} recipes Normalized recipes currently cached in memory.
 * @returns {RecipeStats} Aggregate counts by type, mod, and format.
 */
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

module.exports = {
    normalizeRecipeTypeValue,
    getModFromId,
    getMachineTypeFromRecipeType,
    extractInputs,
    extractOutputs,
    extractCraftingInputs,
    extractCraftingOutputs,
    getRecipeStats
};