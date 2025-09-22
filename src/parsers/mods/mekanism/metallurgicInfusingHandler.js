'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} MetallurgicInfusingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addMetallurgicInfusing'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag to be infused).
 * @property {string} chemicalInput Raw chemical input specification (infusion chemical).
 * @property {string} output Raw output specification (infused result).
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism metallurgic infusing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:metallurgic_infusing>.addRecipe() methods. Metallurgic
 * infusing recipes define operations performed by the Metallurgic Infuser to
 * enhance metals and materials with chemical infusions.
 *
 * These recipes are used by Mekanism's Metallurgic Infuser to create
 * enhanced materials by infusing base materials with various chemicals
 * like carbon, diamond, or other enhancement agents. The infusing process specifies:
 * - Input item or tag to be enhanced
 * - Chemical infusion agent (typically with quantity multiplier)
 * - Output enhanced item
 * - Per-tick processing flag
 */
class MetallurgicInfusingHandler extends BaseMekanismHandler {
    constructor() {
        super('metallurgic_infusing', 'addMetallurgicInfusing');
    }

    /**
     * Parse metallurgic infusing recipe parameters: input, chemical_input, output, per_tick_flag
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
            throw new Error(`Unable to match mekanism metallurgic infusing recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        // Parse the boolean flag
        const perTickStr = params[3].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism metallurgic infusing recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            perTick: perTick
        };
    }
}

module.exports = new MetallurgicInfusingHandler();