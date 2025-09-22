'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} CrushingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addCrushing'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag).
 * @property {string} output Raw output specification (crushed item).
 */

/**
 * Recipe handler for Mekanism crushing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:crushing>.addRecipe() methods. Crushing
 * recipes define operations performed by the Crusher to break down
 * items into smaller components like dusts, fragments, or shards.
 *
 * These recipes are used by Mekanism's Crusher machine to process
 * ores, ingots, and other materials. The crushing process specifies:
 * - Input item or tag to be crushed
 * - Output item (typically dust, shard, or fragment)
 * - No additional parameters like time or energy cost (handled by machine)
 */
class CrushingHandler extends BaseMekanismHandler {
    constructor() {
        super('crushing', 'addCrushing');
    }

    /**
     * Parse crushing recipe parameters: input, output
     *
     * Expected pattern: <input>, <output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate input from output
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism crushing recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new CrushingHandler();