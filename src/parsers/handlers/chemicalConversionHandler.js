'use strict';

/**
 * @typedef {Object} ChemicalConversionRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addChemicalConversion'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (items, tags, or OR chains).
 * @property {string} output Raw chemical output specification with quantity multiplier.
 */

/**
 * Recipe handler for Mekanism chemical conversion recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:chemical_conversion>.addRecipe() methods. Chemical conversion
 * recipes define operations that convert physical items (ores, dusts, fuels, etc.)
 * into chemical forms for use in Mekanism's chemical processing systems.
 *
 * These recipes are used by Mekanism machines like the Chemical Dissolution Chamber
 * to break down items into their chemical components. The conversion specifies:
 * - Input items or item tags (can include OR chains of alternatives)
 * - Output chemical with quantity multiplier (* N syntax)
 * - No additional parameters like time or energy cost (handled by machine)
 */
module.exports = {
    name: 'chemical-conversion-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a mekanism chemical conversion
     * recipe call. The score is used by the dispatcher to select the appropriate
     * handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains chemical conversion recipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('<recipetype:mekanism:chemical_conversion>.addRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a mekanism chemical conversion recipe method call segment.
     *
     * Parses the method call to extract the recipe identifier, input specification,
     * and chemical output with quantity. The pattern expects exactly 3 parameters:
     *
     * <recipetype:mekanism:chemical_conversion>.addRecipe("id", <input>, <chemical_output>);
     *
     * The input can be individual items, item tags, or OR chains of alternatives.
     * The output is always a chemical with a quantity multiplier (* N).
     *
     * @param {Object} segment Recipe segment containing chemical conversion recipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {ChemicalConversionRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected chemical conversion pattern.
     */
    parse(segment) {
        // First, verify this is a chemical conversion recipe
        if (!segment.rawText.includes('<recipetype:mekanism:chemical_conversion>.addRecipe(')) {
            throw new Error('Unable to match mekanism chemical conversion recipe pattern');
        }

        // Extract the parameters portion from the addRecipe call
        const paramMatch = segment.rawText.match(/<recipetype:mekanism:chemical_conversion>\.addRecipe\((.*)\);\s*$/);
        if (!paramMatch) {
            throw new Error('Unable to match mekanism chemical conversion recipe pattern');
        }

        const paramsString = paramMatch[1];

        // Parse the recipe ID (first quoted parameter)
        const recipeIdMatch = paramsString.match(/^"([^"]+)"/);
        if (!recipeIdMatch) {
            throw new Error('Unable to match mekanism chemical conversion recipe pattern');
        }
        const recipeId = recipeIdMatch[1];

        // Remove recipe ID and find remaining parameters
        let remaining = paramsString.substring(recipeIdMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Find the last comma to separate input from output
        const lastCommaIndex = remaining.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error('Unable to match mekanism chemical conversion recipe pattern');
        }

        const inputSpec = remaining.substring(0, lastCommaIndex).trim();
        const outputSpec = remaining.substring(lastCommaIndex + 1).trim();

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addChemicalConversion',
            input: inputSpec,
            output: outputSpec
        };
    }
};