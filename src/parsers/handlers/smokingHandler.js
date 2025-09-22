'use strict';

/**
 * @typedef {Object} SmokingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addSmoking'} format Handler format identifier for normalization.
 * @property {string} output Raw output specification as written in the log.
 * @property {string} input Raw input specification (item or tag) from the method call.
 * @property {number} experience Experience points awarded when recipe completes.
 * @property {number} cookTime Cooking time in ticks for the smoker recipe.
 */

/**
 * Recipe handler for CraftTweaker smoking recipes.
 *
 * This handler processes recipe segments containing calls to smoker.addRecipe()
 * methods. Smoking recipes define cooking operations with specific inputs,
 * outputs, experience rewards, and cooking times for the smoker block.
 * Smokers are typically faster than regular furnaces and used for food items.
 */
module.exports = {
    name: 'smoking-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a smoker.addRecipe call.
     * The score is used by the dispatcher to select the appropriate handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains smoker.addRecipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('smoker.addRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a smoker.addRecipe method call segment.
     *
     * Parses the method call to extract the recipe identifier, output item, input item/tag,
     * experience value, and cooking time. The pattern expects exactly 5 parameters in the
     * method call for successful parsing.
     *
     * @param {Object} segment Recipe segment containing smoker.addRecipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {SmokingRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected smoker.addRecipe pattern.
     */
    parse(segment) {
        const match = segment.rawText.match(/smoker\.addRecipe\("([^"]+)",\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\);\s*$/);

        if (!match) {
            throw new Error('Unable to match smoker.addRecipe pattern');
        }

        const [, recipeId, outputSpec, inputSpec, experienceStr, cookTimeStr] = match;

        // Parse numeric values with fallback defaults
        const experience = parseFloat(experienceStr.trim()) || 0.0;
        const cookTime = parseInt(cookTimeStr.trim(), 10) || 100;

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addSmoking',
            output: outputSpec.trim(),
            input: inputSpec.trim(),
            experience,
            cookTime
        };
    }
};