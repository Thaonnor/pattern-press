'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} CombiningRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCombining'} format Handler format identifier for normalization.
 * @property {string} mainInput Raw main input specification.
 * @property {string} extraInput Raw extra input specification (often with multipliers).
 * @property {string} output Raw output specification.
 */

/**
 * Recipe handler for Mekanism combining recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:combining>.addRecipe() methods. Combining
 * recipes define operations performed by the Combiner to merge
 * multiple items into a single output item.
 *
 * These recipes are used by Mekanism's Combiner machine to
 * create items by combining a primary input with additional
 * materials. The combining process typically specifies:
 * - Main input item or tag
 * - Extra input item (often with quantity multiplier)
 * - Output item (often with quantity multiplier)
 */
class CombiningHandler extends BaseMekanismHandler {
    constructor() {
        super('combining', 'addCombining');
    }

    /**
     * Parse combining recipe parameters: main_input, extra_input, output
     *
     * Expected pattern: <main_input>, <extra_input>, <output>
     * The extra_input and output may have quantity multipliers like (* 2)
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with mainInput, extraInput, and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 3) {
            throw new Error(`Unable to match mekanism combining recipe pattern - expected 3 parameters, got ${params.length}`);
        }

        return {
            mainInput: params[0],
            extraInput: params[1],
            output: params[2]
        };
    }
}

module.exports = new CombiningHandler();