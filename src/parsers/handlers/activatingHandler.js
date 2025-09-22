'use strict';

/**
 * @typedef {Object} ActivatingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addActivating'} format Handler format identifier for normalization.
 * @property {string} input Raw input chemical specification.
 * @property {string} output Raw output chemical specification.
 */

/**
 * Recipe handler for Mekanism activating recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:activating>.addRecipe() methods. Activating
 * recipes define chemical activation operations that use solar neutron
 * activators to transform one chemical into another through neutron activation.
 *
 * These recipes are used by Mekanism's Solar Neutron Activator machine
 * to process chemicals for nuclear operations, particularly for creating
 * radioactive isotopes. The activation process specifies:
 * - Input chemical with optional quantity multiplier (* N syntax)
 * - Output chemical with optional quantity multiplier (* N syntax)
 * - No additional parameters like time or energy cost (handled by machine)
 */
module.exports = {
    name: 'activating-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a mekanism activating
     * recipe call. The score is used by the dispatcher to select the appropriate
     * handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains activating recipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('<recipetype:mekanism:activating>.addRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a mekanism activating recipe method call segment.
     *
     * Parses the method call to extract the recipe identifier, input chemical,
     * and output chemical. The pattern expects exactly 3 parameters:
     *
     * <recipetype:mekanism:activating>.addRecipe("id", <input_chemical>, <output_chemical>);
     *
     * Both input and output are chemical specifications that can include
     * quantity multipliers (* N syntax).
     *
     * @param {Object} segment Recipe segment containing activating recipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {ActivatingRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected activating pattern.
     */
    parse(segment) {
        // First, verify this is an activating recipe
        if (!segment.rawText.includes('<recipetype:mekanism:activating>.addRecipe(')) {
            throw new Error('Unable to match mekanism activating recipe pattern');
        }

        // Extract the parameters portion from the addRecipe call
        const paramMatch = segment.rawText.match(/<recipetype:mekanism:activating>\.addRecipe\((.*)\);\s*$/);
        if (!paramMatch) {
            throw new Error('Unable to match mekanism activating recipe pattern');
        }

        const paramsString = paramMatch[1];

        // Parse the recipe ID (first quoted parameter)
        const recipeIdMatch = paramsString.match(/^"([^"]+)"/);
        if (!recipeIdMatch) {
            throw new Error('Unable to match mekanism activating recipe pattern');
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
            throw new Error('Unable to match mekanism activating recipe pattern');
        }

        const inputSpec = remaining.substring(0, lastCommaIndex).trim();
        const outputSpec = remaining.substring(lastCommaIndex + 1).trim();

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addActivating',
            input: inputSpec,
            output: outputSpec
        };
    }
};