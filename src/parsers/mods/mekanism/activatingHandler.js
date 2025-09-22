'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

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
class ActivatingHandler extends BaseMekanismHandler {
    constructor() {
        super('activating', 'addActivating');
    }

    /**
     * Parse activating recipe parameters: input_chemical, output_chemical
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
            throw new Error(`Unable to match mekanism activating recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new ActivatingHandler();