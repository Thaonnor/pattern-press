'use strict';

/**
 * @typedef {Object} CookingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCooking'} format Handler format identifier for normalization.
 * @property {string} output Raw output specification (resulting cooked item).
 * @property {string} ingredients Raw ingredients array specification with items and tags.
 * @property {string} container Raw container specification (bowl, bottle, etc. with .mutable()).
 * @property {number} experience Experience points awarded when recipe completes.
 * @property {number} cookTime Cooking time in ticks for the cooking pot recipe.
 */

/**
 * Recipe handler for Farmer's Delight cooking recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:farmersdelight:cooking>.addRecipe() methods. Cooking recipes
 * define operations performed in a cooking pot to combine ingredients into
 * cooked dishes, stews, and beverages.
 *
 * The cooking pot allows players to combine multiple ingredients with different
 * containers to create complex food items. Each recipe specifies:
 * - Output item (the finished dish)
 * - Array of ingredient items and tags (can include OR chains)
 * - Container item (bowl, bottle, etc.) that gets consumed
 * - Experience awarded to the player
 * - Cooking time in ticks
 */
module.exports = {
    name: 'cooking-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a farmersdelight cooking
     * recipe call. The score is used by the dispatcher to select the appropriate
     * handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains cooking recipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('<recipetype:farmersdelight:cooking>.addRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a farmersdelight cooking recipe method call segment.
     *
     * Parses the method call to extract the recipe identifier, output item, ingredients array,
     * container specification, experience value, and cooking time. The pattern expects exactly
     * 6 parameters:
     *
     * <recipetype:farmersdelight:cooking>.addRecipe("id", <output>, [ingredients], <container>, experience, cookTime);
     *
     * The ingredients array can contain individual items, tags, and OR chains of alternatives.
     * The container is typically a bowl or bottle with .mutable() specification that gets
     * consumed during cooking.
     *
     * @param {Object} segment Recipe segment containing cooking recipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {CookingRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected cooking recipe pattern.
     */
    parse(segment) {
        // First, verify this is a cooking recipe
        if (!segment.rawText.includes('<recipetype:farmersdelight:cooking>.addRecipe(')) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }

        // Extract the parameters portion from the addRecipe call
        const paramMatch = segment.rawText.match(/<recipetype:farmersdelight:cooking>\.addRecipe\((.*)\);\s*$/);
        if (!paramMatch) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }

        const paramsString = paramMatch[1];

        // Parse the recipe ID (first quoted parameter)
        const recipeIdMatch = paramsString.match(/^"([^"]+)"/);
        if (!recipeIdMatch) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }
        const recipeId = recipeIdMatch[1];

        // Remove recipe ID and find remaining parameters
        let remaining = paramsString.substring(recipeIdMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Parse output (next parameter until we hit the array)
        const outputMatch = remaining.match(/^([^,\[]+)/);
        if (!outputMatch) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }
        const outputSpec = outputMatch[1].trim();

        // Remove output and find ingredients array
        remaining = remaining.substring(outputMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Parse ingredients array
        const arrayMatch = remaining.match(/^(\[[^\]]+\])/);
        if (!arrayMatch) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }
        const ingredientsSpec = arrayMatch[1].trim();

        // Remove ingredients array and parse container
        remaining = remaining.substring(arrayMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Find container (look for parentheses with .mutable())
        const containerMatch = remaining.match(/^(\([^)]+\)\.mutable\(\))/);
        if (!containerMatch) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }
        const containerSpec = containerMatch[1].trim();

        // Remove container and parse the final two numeric parameters
        remaining = remaining.substring(containerMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Split remaining by comma to get experience and cookTime
        const finalParams = remaining.split(',');
        if (finalParams.length !== 2) {
            throw new Error('Unable to match farmersdelight cooking recipe pattern');
        }

        // Parse numeric values with fallback defaults
        const experience = parseFloat(finalParams[0].trim()) || 0.0;
        const cookTime = parseInt(finalParams[1].trim(), 10) || 200;

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addCooking',
            output: outputSpec,
            ingredients: ingredientsSpec,
            container: containerSpec,
            experience,
            cookTime
        };
    }
};