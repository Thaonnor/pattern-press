'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} EnergyConversionRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addEnergyConversion'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag).
 * @property {number} energyOutput Energy value produced by the conversion.
 */

/**
 * Recipe handler for Mekanism energy conversion recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:energy_conversion>.addRecipe() methods. Energy conversion
 * recipes define operations that convert items directly into energy units
 * without producing physical item outputs.
 *
 * These recipes are used to specify how certain materials can be consumed
 * for energy generation. The energy conversion process specifies:
 * - Input item or tag to be converted
 * - Energy value produced (in Joules or FE)
 * - No physical item output (energy only)
 */
class EnergyConversionHandler extends BaseMekanismHandler {
    constructor() {
        super('energy_conversion', 'addEnergyConversion');
    }

    /**
     * Parse energy conversion recipe parameters: input, energy_value
     *
     * Expected pattern: <input>, <number>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and energyOutput properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate input from energy value
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism energy conversion recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const energyStr = paramsString.substring(lastCommaIndex + 1).trim();

        // Parse the energy value
        const energyOutput = parseInt(energyStr, 10);
        if (isNaN(energyOutput)) {
            throw new Error(`Unable to parse energy value in mekanism energy conversion recipe: ${energyStr}`);
        }

        return {
            input: inputSpec,
            energyOutput: energyOutput
        };
    }
}

module.exports = new EnergyConversionHandler();