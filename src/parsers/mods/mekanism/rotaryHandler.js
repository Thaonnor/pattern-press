'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} RotaryRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addRotary'} format Handler format identifier for normalization.
 * @property {string} fluidInput Raw fluid input specification (for fluid-to-chemical mode).
 * @property {string} chemicalFromFluid Raw chemical output when converting from fluid.
 * @property {string} chemicalToFluid Raw chemical input when converting to fluid.
 * @property {string} fluidOutput Raw fluid output specification (for chemical-to-fluid mode).
 */

/**
 * Recipe handler for Mekanism rotary recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:rotary>.addRecipe() methods. Rotary
 * recipes define bidirectional operations performed by the Rotary
 * Condensentrator to convert between fluid and chemical forms.
 *
 * These recipes are used by Mekanism's Rotary Condensentrator which
 * can operate in two modes:
 * - Condensentrating mode: converts chemicals to fluids
 * - Decondensentrating mode: converts fluids to chemicals
 * The recipe specifies both conversions for the same material.
 */
class RotaryHandler extends BaseMekanismHandler {
    constructor() {
        super('rotary', 'addRotary');
    }

    /**
     * Parse rotary recipe parameters: fluid_input, chemical_from_fluid, chemical_to_fluid, fluid_output
     *
     * Expected pattern: <fluid_input>, <chemical_from_fluid>, <chemical_to_fluid>, <fluid_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with fluidInput, chemicalFromFluid, chemicalToFluid, and fluidOutput properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 4) {
            throw new Error(`Unable to match mekanism rotary recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        return {
            fluidInput: params[0],
            chemicalFromFluid: params[1],
            chemicalToFluid: params[2],
            fluidOutput: params[3]
        };
    }
}

module.exports = new RotaryHandler();