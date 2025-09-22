'use strict';

/**
 * @typedef {Object} CuttingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCutting'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item being cut/processed).
 * @property {string} outputs Raw outputs array specification with mutable items.
 * @property {string} tool Raw tool specification (can be single item, tag, or OR chain).
 * @property {string} optional Raw optional parameter (typically "Optional.empty").
 */

/**
 * Recipe handler for Farmer's Delight cutting recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:farmersdelight:cutting>.addRecipe() methods. Cutting recipes
 * define operations performed on a cutting board to break down items into
 * components or transform them using various tools.
 *
 * The cutting board allows players to use knives, axes, pickaxes, and other
 * tools to process items. Each recipe specifies:
 * - Input item to be processed
 * - Array of output items (with quantities and .mutable() specifications)
 * - Tools that can perform the operation (individual items, tags, or OR chains)
 * - Optional parameter for additional configuration
 */
module.exports = {
    name: 'cutting-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a farmersdelight cutting
     * recipe call. The score is used by the dispatcher to select the appropriate
     * handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains cutting recipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('<recipetype:farmersdelight:cutting>.addRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a farmersdelight cutting recipe method call segment.
     *
     * Parses the method call to extract the recipe identifier, input item, outputs array,
     * tool specification, and optional parameter. The pattern expects exactly 5 parameters:
     *
     * <recipetype:farmersdelight:cutting>.addRecipe("id", <input>, [outputs], <tool>, Optional.empty);
     *
     * The outputs array typically contains items with .mutable() specifications and
     * quantity multipliers (* N). The tool parameter can be a single item, tag reference,
     * or complex OR chain of multiple tools.
     *
     * @param {Object} segment Recipe segment containing cutting recipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {CuttingRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected cutting recipe pattern.
     */
    parse(segment) {
        // First, verify this is a cutting recipe
        if (!segment.rawText.includes('<recipetype:farmersdelight:cutting>.addRecipe(')) {
            throw new Error('Unable to match farmersdelight cutting recipe pattern');
        }

        // Extract the parameters portion from the addRecipe call
        const paramMatch = segment.rawText.match(/<recipetype:farmersdelight:cutting>\.addRecipe\((.*)\);\s*$/);
        if (!paramMatch) {
            throw new Error('Unable to match farmersdelight cutting recipe pattern');
        }

        const paramsString = paramMatch[1];

        // Parse the recipe ID (first quoted parameter)
        const recipeIdMatch = paramsString.match(/^"([^"]+)"/);
        if (!recipeIdMatch) {
            throw new Error('Unable to match farmersdelight cutting recipe pattern');
        }
        const recipeId = recipeIdMatch[1];

        // Remove recipe ID and find remaining parameters
        let remaining = paramsString.substring(recipeIdMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Parse input (next parameter until we hit the array)
        const inputMatch = remaining.match(/^([^,\[]+)/);
        if (!inputMatch) {
            throw new Error('Unable to match farmersdelight cutting recipe pattern');
        }
        const inputSpec = inputMatch[1].trim();

        // Remove input and find outputs array
        remaining = remaining.substring(inputMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Parse outputs array
        const arrayMatch = remaining.match(/^(\[[^\]]+\])/);
        if (!arrayMatch) {
            throw new Error('Unable to match farmersdelight cutting recipe pattern');
        }
        const outputsSpec = arrayMatch[1].trim();

        // Remove outputs array and find tool parameter
        remaining = remaining.substring(arrayMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Find the last comma to separate tool from optional parameter
        const lastCommaIndex = remaining.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error('Unable to match farmersdelight cutting recipe pattern');
        }

        const toolSpec = remaining.substring(0, lastCommaIndex).trim();
        const optionalSpec = remaining.substring(lastCommaIndex + 1).trim();

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addCutting',
            input: inputSpec,
            outputs: outputsSpec,
            tool: toolSpec,
            optional: optionalSpec
        };
    }
};