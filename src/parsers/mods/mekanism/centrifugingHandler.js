'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} CentrifugingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCentrifuging'} format Handler format identifier for normalization.
 * @property {string} input Raw input chemical specification.
 * @property {string} output Raw output chemical specification.
 */

/**
 * Recipe handler for Mekanism centrifuging recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:centrifuging>.addRecipe() methods. Centrifuging
 * recipes define chemical separation operations that use centrifuges
 * to separate one chemical into another through centrifugal force.
 *
 * These recipes are used by Mekanism's Isotopic Centrifuge machine
 * to process chemicals for nuclear and advanced chemical operations.
 * The centrifuging process specifies:
 * - Input chemical with optional quantity multiplier (* N syntax)
 * - Output chemical with optional quantity multiplier (* N syntax)
 * - No additional parameters like time or energy cost (handled by machine)
 */
class CentrifugingHandler extends BaseMekanismHandler {
    constructor() {
        super('centrifuging', 'addCentrifuging');
    }

    /**
     * Parse centrifuging recipe parameters: input_chemical, output_chemical
     *
     * Expected pattern: <input_chemical>, <output_chemical>
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
            throw new Error(`Unable to match mekanism centrifuging recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new CentrifugingHandler();