'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} PigmentMixingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addPigmentMixing'} format Handler format identifier for normalization.
 * @property {string} leftInput Raw left chemical pigment input specification.
 * @property {string} rightInput Raw right chemical pigment input specification.
 * @property {string} output Raw mixed chemical pigment output specification.
 */

/**
 * Recipe handler for Mekanism pigment mixing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:pigment_mixing>.addRecipe() methods. Pigment mixing
 * recipes define operations performed by the Pigment Mixer to combine
 * two chemical pigments into a new mixed pigment color.
 *
 * These recipes are used by Mekanism's Pigment Mixer to create
 * new pigment colors by blending existing pigments together,
 * similar to how paint colors are mixed in real life. The mixing process specifies:
 * - Left chemical pigment input
 * - Right chemical pigment input
 * - Mixed chemical pigment output (typically with quantity multiplier)
 */
class PigmentMixingHandler extends BaseMekanismHandler {
    constructor() {
        super('pigment_mixing', 'addPigmentMixing');
    }

    /**
     * Parse pigment mixing recipe parameters: left_pigment, right_pigment, mixed_pigment_output
     *
     * Expected pattern: <left_pigment>, <right_pigment>, <mixed_pigment_output>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with leftInput, rightInput, and output properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 3) {
            throw new Error(`Unable to match mekanism pigment mixing recipe pattern - expected 3 parameters, got ${params.length}`);
        }

        return {
            leftInput: params[0],
            rightInput: params[1],
            output: params[2]
        };
    }
}

module.exports = new PigmentMixingHandler();