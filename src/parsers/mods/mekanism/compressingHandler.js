'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} CompressingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCompressing'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag).
 * @property {string} chemicalInput Raw chemical input specification (compressing agent).
 * @property {string} output Raw output specification (compressed result).
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism compressing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:compressing>.addRecipe() methods. Compressing
 * recipes define operations performed by the Osmium Compressor to
 * compress materials using osmium gas into refined forms.
 *
 * These recipes are used by Mekanism's Osmium Compressor to create
 * refined materials like refined glowstone and obsidian. The compressing
 * process specifies:
 * - Input item or tag to be compressed
 * - Chemical input (typically osmium gas)
 * - Output item (compressed/refined result)
 * - Per-tick processing flag
 */
class CompressingHandler extends BaseMekanismHandler {
    constructor() {
        super('compressing', 'addCompressing');
    }

    /**
     * Parse compressing recipe parameters: input, chemical_input, output, per_tick_flag
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
            throw new Error(`Unable to match mekanism compressing recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        // Parse the boolean flag
        const perTickStr = params[3].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism compressing recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            perTick: perTick
        };
    }
}

module.exports = new CompressingHandler();