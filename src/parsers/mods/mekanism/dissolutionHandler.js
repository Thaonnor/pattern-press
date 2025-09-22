'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} DissolutionRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addDissolution'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag to dissolve).
 * @property {string} chemicalInput Raw chemical input specification (dissolving agent).
 * @property {string} output Raw chemical output specification (result of dissolution).
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism dissolution recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:dissolution>.addRecipe() methods. Dissolution
 * recipes define operations performed by the Chemical Dissolution Chamber
 * to break down items into their chemical components using chemical solvents.
 *
 * These recipes are used by Mekanism's Chemical Dissolution Chamber to
 * convert ores and other materials into slurries and other chemicals
 * for further processing. The dissolution process specifies:
 * - Input item or tag to be dissolved
 * - Chemical solvent (typically sulfuric acid)
 * - Chemical output (typically dirty slurry)
 * - Per-tick processing flag
 */
class DissolutionHandler extends BaseMekanismHandler {
    constructor() {
        super('dissolution', 'addDissolution');
    }

    /**
     * Parse dissolution recipe parameters: input, chemical_input, chemical_output, per_tick_flag
     *
     * Expected pattern: <input>, <chemical_input>, <chemical_output>, <boolean>
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
            throw new Error(`Unable to match mekanism dissolution recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        // Parse the boolean flag
        const perTickStr = params[3].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism dissolution recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            perTick: perTick
        };
    }
}

module.exports = new DissolutionHandler();