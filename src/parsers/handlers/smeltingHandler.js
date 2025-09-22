'use strict';

/**
 * @typedef {Object} SmeltingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addSmelting'} format Handler format identifier for normalization.
 * @property {string} output Raw output specification as written in the log.
 * @property {string} input Raw input specification (item or tag) from the method call.
 * @property {number} experience Experience points awarded when recipe completes.
 * @property {number} cookTime Cooking time in ticks for the furnace recipe.
 */

/**
 * Recipe handler for CraftTweaker smelting recipes.
 *
 * This handler processes recipe segments containing calls to furnace.addRecipe()
 * methods. Smelting recipes define cooking operations with specific inputs,
 * outputs, experience rewards, and cooking times for the standard furnace block.
 */
module.exports = {
    name: 'smelting-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a furnace.addRecipe call.
     * The score is used by the dispatcher to select the appropriate handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains furnace.addRecipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('furnace.addRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a furnace.addRecipe method call segment.
     *
     * Parses the method call to extract the recipe identifier, output item, input item/tag,
     * experience value, and cooking time. The pattern expects exactly 5 parameters in the
     * method call for successful parsing.
     *
     * @param {Object} segment Recipe segment containing furnace.addRecipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {SmeltingRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected furnace.addRecipe pattern.
     */
    parse(segment) {
        const match = segment.rawText.match(/furnace\.addRecipe\("([^"]+)",\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\);\s*$/);

        if (!match) {
            throw new Error('Unable to match furnace.addRecipe pattern');
        }

        const [, recipeId, outputSpec, inputSpec, experienceStr, cookTimeStr] = match;

        // Parse numeric values with fallback defaults
        const experience = parseFloat(experienceStr.trim()) || 0.0;
        const cookTime = parseInt(cookTimeStr.trim(), 10) || 200;

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addSmelting',
            output: outputSpec.trim(),
            input: inputSpec.trim(),
            experience,
            cookTime
        };
    }
};