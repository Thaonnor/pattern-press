'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} PigmentExtractingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addPigmentExtracting'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (colored item to extract from).
 * @property {string} output Raw chemical output specification (extracted pigment).
 */

/**
 * Recipe handler for Mekanism pigment extracting recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:pigment_extracting>.addRecipe() methods. Pigment extracting
 * recipes define operations performed by the Pigment Extractor to extract
 * chemical pigments from colored items like banners, dyes, and blocks.
 *
 * These recipes are used by Mekanism's Pigment Extractor to convert
 * colored items into their chemical pigment forms for use in other
 * processes like painting or pigment mixing. The extracting process specifies:
 * - Input colored item or tag
 * - Chemical pigment output (typically with quantity multiplier)
 * - No additional parameters (simple extraction)
 */
class PigmentExtractingHandler extends BaseMekanismHandler {
    constructor() {
        super('pigment_extracting', 'addPigmentExtracting');
    }

    /**
     * Parse pigment extracting recipe parameters: input_item, chemical_pigment_output
     *
     * Expected pattern: <input_item>, <chemical_pigment_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Find the last comma to separate input from pigment output
        const lastCommaIndex = paramsString.lastIndexOf(',');
        if (lastCommaIndex === -1) {
            throw new Error(`Unable to match mekanism pigment extracting recipe pattern`);
        }

        const inputSpec = paramsString.substring(0, lastCommaIndex).trim();
        const outputSpec = paramsString.substring(lastCommaIndex + 1).trim();

        return {
            input: inputSpec,
            output: outputSpec
        };
    }
}

module.exports = new PigmentExtractingHandler();