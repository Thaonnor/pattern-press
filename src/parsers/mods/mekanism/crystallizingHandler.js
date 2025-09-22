'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} CrystallizingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCrystallizing'} format Handler format identifier for normalization.
 * @property {string} input Raw chemical input specification (typically with quantity).
 * @property {string} output Raw item output specification (crystallized result).
 */

/**
 * Recipe handler for Mekanism crystallizing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:crystallizing>.addRecipe() methods. Crystallizing
 * recipes define operations performed by the Chemical Crystallizer to
 * solidify chemical slurries and solutions into solid items.
 *
 * These recipes are used by Mekanism's Chemical Crystallizer to
 * convert processed chemicals back into solid materials, typically
 * as the final step in ore processing. The crystallizing process specifies:
 * - Chemical input (typically slurry or solution with quantity)
 * - Solid item output (typically dust, crystal, or ingot)
 */
class CrystallizingHandler extends BaseMekanismHandler {
    constructor() {
        super('crystallizing', 'addCrystallizing');
    }

    /**
     * Parse crystallizing recipe parameters: chemical_input, item_output
     *
     * Expected pattern: <chemical_input> * quantity, <item_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate chemical input from item output
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism crystallizing recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new CrystallizingHandler();