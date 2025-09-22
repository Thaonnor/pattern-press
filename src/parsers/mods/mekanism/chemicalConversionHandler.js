'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

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
class ChemicalConversionHandler extends BaseMekanismHandler {
    constructor() {
        super('chemical_conversion', 'addChemicalConversion');
    }

    /**
     * Parse chemical conversion recipe parameters: input, chemical_output
     *
     * Expected pattern: <input>, <chemical_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate input from output
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism chemical conversion recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new ChemicalConversionHandler();