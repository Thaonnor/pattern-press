'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} SawingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addSawing'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item to be sawed).
 * @property {string} primaryOutput Raw primary output specification (main result).
 * @property {string} secondaryOutput Raw secondary output specification (optional byproduct).
 * @property {number} probability Probability of secondary output (0.0 to 1.0).
 */

/**
 * Recipe handler for Mekanism sawing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:sawing>.addRecipe() methods. Sawing
 * recipes define operations performed by the Precision Sawmill to
 * cut items into precise pieces with optional secondary outputs.
 *
 * These recipes are used by Mekanism's Precision Sawmill to
 * process items like logs, planks, and other materials with precise
 * cuts that can yield additional byproducts. The sawing process specifies:
 * - Input item to be cut/sawed
 * - Primary output (main result with quantity)
 * - Secondary output (optional byproduct)
 * - Probability for secondary output drop (0.0 to 1.0)
 */
class SawingHandler extends BaseMekanismHandler {
    constructor() {
        super('sawing', 'addSawing');
    }

    /**
     * Parse sawing recipe parameters: supports both 2-param and 4-param patterns
     *
     * 2-param pattern: <input>, <primary_output>
     * 4-param pattern: <input>, <primary_output>, <secondary_output>, <probability>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input, primaryOutput, secondaryOutput, and probability properties
     * @throws {Error} When parameters don't match expected patterns
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length === 2) {
            // 2-parameter pattern: input, primary_output (no secondary output or probability)
            return {
                input: params[0],
                primaryOutput: params[1],
                secondaryOutput: null,
                probability: 0.0
            };
        } else if (params.length === 4) {
            // 4-parameter pattern: input, primary_output, secondary_output, probability
            const probabilityStr = params[3].trim();
            const probability = parseFloat(probabilityStr);
            if (isNaN(probability)) {
                throw new Error(`Unable to parse probability in mekanism sawing recipe: ${probabilityStr}`);
            }

            return {
                input: params[0],
                primaryOutput: params[1],
                secondaryOutput: params[2],
                probability: probability
            };
        } else {
            throw new Error(`Unable to match mekanism sawing recipe pattern - expected 2 or 4 parameters, got ${params.length}`);
        }
    }
}

module.exports = new SawingHandler();