'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} InjectingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addInjecting'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag to be injected).
 * @property {string} chemicalInput Raw chemical input specification (injection chemical).
 * @property {string} output Raw output specification (injected result).
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism injecting recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:injecting>.addRecipe() methods. Injecting
 * recipes define operations performed by the Chemical Injection Chamber
 * to inject chemicals into items, typically as part of advanced ore processing.
 *
 * These recipes are used by Mekanism's Chemical Injection Chamber in
 * the 4x ore processing chain, where chemicals are injected into items
 * to enhance their properties or transform them. The injecting process specifies:
 * - Input item or tag to be injected with chemicals
 * - Chemical input (injection agent)
 * - Output transformed item
 * - Per-tick processing flag
 */
class InjectingHandler extends BaseMekanismHandler {
    constructor() {
        super('injecting', 'addInjecting');
    }

    /**
     * Parse injecting recipe parameters: input, chemical_input, output, per_tick_flag
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
            throw new Error(`Unable to match mekanism injecting recipe pattern - expected 4 parameters, got ${params.length}`);
        }

        // Parse the boolean flag
        const perTickStr = params[3].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism injecting recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            perTick: perTick
        };
    }
}

module.exports = new InjectingHandler();