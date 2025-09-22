'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} WashingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addWashing'} format Handler format identifier for normalization.
 * @property {string} fluidInput Raw fluid input specification (typically water).
 * @property {string} dirtyInput Raw dirty chemical input specification.
 * @property {string} cleanOutput Raw clean chemical output specification.
 */

/**
 * Recipe handler for Mekanism washing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:washing>.addRecipe() methods. Washing
 * recipes define operations performed by the Chemical Washer to
 * clean dirty slurries into clean slurries using fluid (typically water).
 *
 * These recipes are used by Mekanism's Chemical Washer as part of
 * the 3x ore processing chain, where dirty slurries from the Chemical
 * Dissolution Chamber are washed with water to produce clean slurries
 * for further processing. The washing process specifies:
 * - Fluid input (typically water with quantity multiplier)
 * - Dirty chemical input (dirty slurry)
 * - Clean chemical output (clean slurry)
 */
class WashingHandler extends BaseMekanismHandler {
    constructor() {
        super('washing', 'addWashing');
    }

    /**
     * Parse washing recipe parameters: fluid_input, dirty_chemical_input, clean_chemical_output
     *
     * Expected pattern: <fluid_input>, <dirty_chemical_input>, <clean_chemical_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with fluidInput, dirtyInput, and cleanOutput properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 3) {
            throw new Error(`Unable to match mekanism washing recipe pattern - expected 3 parameters, got ${params.length}`);
        }

        return {
            fluidInput: params[0],
            dirtyInput: params[1],
            cleanOutput: params[2]
        };
    }
}

module.exports = new WashingHandler();