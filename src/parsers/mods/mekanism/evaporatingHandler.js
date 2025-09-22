'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} EvaporatingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addEvaporating'} format Handler format identifier for normalization.
 * @property {string} input Raw input fluid specification (typically with quantity).
 * @property {string} output Raw output fluid specification (evaporation result).
 */

/**
 * Recipe handler for Mekanism evaporating recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:evaporating>.addRecipe() methods. Evaporating
 * recipes define operations performed by the Thermal Evaporation Plant
 * to concentrate fluids through evaporation processes.
 *
 * These recipes are used by Mekanism's Thermal Evaporation Plant to
 * process fluids like water into concentrated forms like brine through
 * solar evaporation. The evaporating process specifies:
 * - Input fluid (typically with quantity multiplier)
 * - Output concentrated fluid
 * - No additional parameters (simple fluid transformation)
 */
class EvaporatingHandler extends BaseMekanismHandler {
    constructor() {
        super('evaporating', 'addEvaporating');
    }

    /**
     * Parse evaporating recipe parameters: input_fluid, output_fluid
     *
     * Expected pattern: <input_fluid>, <output_fluid>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate input fluid from output fluid
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism evaporating recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new EvaporatingHandler();