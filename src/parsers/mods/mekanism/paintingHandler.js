'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} PaintingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addPainting'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag to be painted).
 * @property {string} chemicalInput Raw chemical input specification (paint/dye chemical).
 * @property {string} output Raw output specification (painted result).
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism painting recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:painting>.addRecipe() methods. Painting
 * recipes define operations performed by the Painting Machine to
 * apply chemical dyes to items, changing their color properties.
 *
 * These recipes are used by Mekanism's Painting Machine to colorize
 * items like banners, blocks, and other paintable materials using
 * chemical dyes. The painting process specifies:
 * - Input item or tag to be painted
 * - Chemical dye (typically with quantity multiplier)
 * - Output painted item
 * - Per-tick processing flag
 */
class PaintingHandler extends BaseMekanismHandler {
    constructor() {
        super('painting', 'addPainting');
    }

    /**
     * Parse painting recipe parameters: input, chemical_input, output, per_tick_flag
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
            throw new Error(`Unable to match mekanism painting recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        // Parse the boolean flag
        const perTickStr = params[3].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism painting recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            perTick: perTick
        };
    }
}

module.exports = new PaintingHandler();