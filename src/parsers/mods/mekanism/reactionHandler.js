'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} ReactionRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addReaction'} format Handler format identifier for normalization.
 * @property {string} itemInput Raw item input specification (solid input).
 * @property {string} fluidInput Raw fluid input specification.
 * @property {string} chemicalInput Raw chemical input specification.
 * @property {number} duration Processing duration in ticks.
 * @property {string} itemOutput Raw item output specification (solid output).
 * @property {string} chemicalOutput Raw chemical output specification.
 */

/**
 * Recipe handler for Mekanism reaction recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:reaction>.addRecipe() methods. Reaction
 * recipes define complex operations performed by the Pressurized
 * Reaction Chamber that combine solid, fluid, and chemical inputs.
 *
 * These recipes are used by Mekanism's Pressurized Reaction Chamber
 * for advanced chemical processing that requires precise combinations
 * of different material states. The reaction process specifies:
 * - Item input (solid material like dust or blocks)
 * - Fluid input (liquid component with quantity)
 * - Chemical input (gas/chemical component with quantity)
 * - Duration (processing time in ticks)
 * - Item output (solid product)
 * - Chemical output (gas/chemical product with quantity)
 */
class ReactionHandler extends BaseMekanismHandler {
    constructor() {
        super('reaction', 'addReaction');
    }

    /**
     * Parse reaction recipe parameters: supports 5, 6, and 7 parameter patterns
     *
     * 5-param pattern: <item_input>, <fluid_input>, <chemical_input>, <duration>, <chemical_output>
     * 6-param pattern: <item_input>, <fluid_input>, <chemical_input>, <duration>, <item_output>, <chemical_output>
     * 7-param pattern: <item_input>, <fluid_input>, <chemical_input>, <duration>, <item_output>, <chemical_output>, <extra_param>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with itemInput, fluidInput, chemicalInput, duration, itemOutput, chemicalOutput, and extraParam properties
     * @throws {Error} When parameters don't match expected patterns
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length < 5 || params.length > 7) {
            throw new Error(`Unable to match mekanism reaction recipe pattern - expected 5-7 parameters, got ${params.length}`);
        }

        // Parse the duration value (always at position 3)
        const durationStr = params[3].trim();
        const duration = parseInt(durationStr, 10);
        if (isNaN(duration)) {
            throw new Error(`Unable to parse duration in mekanism reaction recipe: ${durationStr}`);
        }

        const result = {
            itemInput: params[0],
            fluidInput: params[1],
            chemicalInput: params[2],
            duration: duration,
            itemOutput: null,
            chemicalOutput: null,
            extraParam: null
        };

        if (params.length === 5) {
            // 5-param: no item output, chemical output at position 4
            result.chemicalOutput = params[4];
        } else if (params.length === 6) {
            // 6-param: item output at 4, chemical output at 5
            result.itemOutput = params[4];
            result.chemicalOutput = params[5];
        } else if (params.length === 7) {
            // 7-param: item output at 4, chemical output at 5, extra param at 6
            result.itemOutput = params[4];
            result.chemicalOutput = params[5];
            result.extraParam = params[6];
        }

        return result;
    }
}

module.exports = new ReactionHandler();