'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} EnrichingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addEnriching'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag).
 * @property {string} output Raw output specification (enriched item).
 */

/**
 * Recipe handler for Mekanism enriching recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:enriching>.addRecipe() methods. Enriching
 * recipes define operations performed by the Enrichment Chamber to
 * enhance or multiply items, particularly ores and raw materials.
 *
 * These recipes are used by Mekanism's Enrichment Chamber machine to
 * process ores into multiple dusts, convert materials into enriched forms,
 * or perform other enhancement operations. The enriching process specifies:
 * - Input item or tag to be enriched
 * - Output item (typically multiple units or enriched variant)
 * - No additional parameters like time or energy cost (handled by machine)
 */
class EnrichingHandler extends BaseMekanismHandler {
    constructor() {
        super('enriching', 'addEnriching');
    }

    /**
     * Parse enriching recipe parameters: input, output
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
            throw new Error(`Unable to match mekanism enriching recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new EnrichingHandler();