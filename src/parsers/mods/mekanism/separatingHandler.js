'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} SeparatingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addSeparating'} format Handler format identifier for normalization.
 * @property {string} fluidInput Raw fluid input specification to be separated.
 * @property {string} leftOutput Raw first chemical output specification.
 * @property {string} rightOutput Raw second chemical output specification.
 */

/**
 * Recipe handler for Mekanism separating recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:separating>.addRecipe() methods. Separating
 * recipes define operations performed by the Electrolytic Separator
 * to break down fluids into their constituent chemical components.
 *
 * These recipes are used by Mekanism's Electrolytic Separator to
 * perform electrolysis on fluids, splitting them into two different
 * chemical outputs. Common examples include separating water into
 * hydrogen and oxygen, or brine into sodium and chlorine. The separating
 * process specifies:
 * - Fluid input (fluid to be separated with quantity)
 * - Left chemical output (first component with quantity)
 * - Right chemical output (second component with quantity)
 */
class SeparatingHandler extends BaseMekanismHandler {
    constructor() {
        super('separating', 'addSeparating');
    }

    /**
     * Parse separating recipe parameters: fluid_input, chemical_output_1, chemical_output_2
     *
     * Expected pattern: <fluid_input>, <chemical_output_1>, <chemical_output_2>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with fluidInput, leftOutput, and rightOutput properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 3) {
            throw new Error(`Unable to match mekanism separating recipe pattern - expected 3 parameters, got ${params.length}`);
        }

        return {
            fluidInput: params[0],
            leftOutput: params[1],
            rightOutput: params[2]
        };
    }
}

module.exports = new SeparatingHandler();