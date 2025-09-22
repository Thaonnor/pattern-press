'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} PurifyingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addPurifying'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag to be purified).
 * @property {string} chemicalInput Raw chemical input specification (purification agent).
 * @property {string} output Raw output specification (purified result).
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism purifying recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:purifying>.addRecipe() methods. Purifying
 * recipes define operations performed by the Chemical Washer in the
 * 3x ore processing chain to purify dirty slurries into clean clumps.
 *
 * These recipes are used by Mekanism's Chemical Washer as part of
 * advanced ore processing, where oxygen is used to clean dirty
 * slurries into clumps for further processing. The purifying process specifies:
 * - Input item or tag to be purified
 * - Chemical input (typically oxygen)
 * - Output purified item (typically clumps with multiplier)
 * - Per-tick processing flag
 */
class PurifyingHandler extends BaseMekanismHandler {
    constructor() {
        super('purifying', 'addPurifying');
    }

    /**
     * Parse purifying recipe parameters: input, chemical_input, output, per_tick_flag
     *
     * Expected pattern: <input>, <chemical_input>, <output>, <boolean>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input, chemicalInput, output, and perTick properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 4) {
            throw new Error(`Unable to match mekanism purifying recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        // Parse the boolean flag
        const perTickStr = params[3].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism purifying recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            perTick: perTick
        };
    }
}

module.exports = new PurifyingHandler();