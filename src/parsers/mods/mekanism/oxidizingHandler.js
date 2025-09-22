'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} OxidizingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addOxidizing'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag to be oxidized).
 * @property {string} output Raw chemical output specification (oxidation result).
 */

/**
 * Recipe handler for Mekanism oxidizing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:oxidizing>.addRecipe() methods. Oxidizing
 * recipes define operations performed by the Chemical Oxidizer to
 * convert solid items into their chemical gas forms through oxidation.
 *
 * These recipes are used by Mekanism's Chemical Oxidizer to create
 * chemicals from items, typically as part of the chemical processing
 * pipeline. The oxidizing process specifies:
 * - Input item or tag to be oxidized
 * - Chemical output (typically with quantity multiplier)
 * - No additional parameters (simpler than other chemical processes)
 */
class OxidizingHandler extends BaseMekanismHandler {
    constructor() {
        super('oxidizing', 'addOxidizing');
    }

    /**
     * Parse oxidizing recipe parameters: input, chemical_output
     *
     * Expected pattern: <input>, <chemical_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate input from chemical output
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism oxidizing recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new OxidizingHandler();