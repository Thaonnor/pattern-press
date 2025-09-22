'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} NucleosynthesizingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addNucleosynthesizing'} format Handler format identifier for normalization.
 * @property {string} input Raw input specification (item or tag for nucleosynthesis).
 * @property {string} chemicalInput Raw chemical input specification (antimatter chemical).
 * @property {string} output Raw output specification (nucleosynthesized result).
 * @property {number} duration Processing duration in ticks.
 * @property {boolean} perTick Whether the recipe processes per tick.
 */

/**
 * Recipe handler for Mekanism nucleosynthesizing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:nucleosynthesizing>.addRecipe() methods. Nucleosynthesizing
 * recipes define operations performed by the Antiprotonic Nucleosynthesizer to
 * perform advanced nuclear synthesis using antimatter to create complex materials.
 *
 * These recipes are used by Mekanism's Antiprotonic Nucleosynthesizer in
 * advanced late-game processing, where antimatter is used to synthesize
 * rare or impossible materials. The nucleosynthesizing process specifies:
 * - Input item or tag for the synthesis base
 * - Antimatter chemical input (typically with quantity multiplier)
 * - Output synthesized item
 * - Processing duration in ticks
 * - Per-tick processing flag
 */
class NucleosynthesizingHandler extends BaseMekanismHandler {
    constructor() {
        super('nucleosynthesizing', 'addNucleosynthesizing');
    }

    /**
     * Parse nucleosynthesizing recipe parameters: input, chemical_input, output, duration, per_tick_flag
     *
     * Expected pattern: <input>, <chemical_input>, <output>, <duration>, <boolean>
     *
     * @param {string} paramsString Parameter string after recipe ID
     * @param {string} recipeId Recipe ID for context
     * @returns {Object} Object with input, chemicalInput, output, duration, and perTick properties
     * @throws {Error} When parameters don't match expected pattern
     */
    parseParameters(paramsString, recipeId) {
        // Use the base class utility to split parameters properly
        const params = this.splitParameters(paramsString);

        if (params.length !== 5) {
            throw new Error(`Unable to match mekanism nucleosynthesizing recipe pattern - expected 5 parameters, got ${params.length}`);
        }

        // Parse the duration value
        const durationStr = params[3].trim();
        const duration = parseInt(durationStr, 10);
        if (isNaN(duration)) {
            throw new Error(`Unable to parse duration in mekanism nucleosynthesizing recipe: ${durationStr}`);
        }

        // Parse the boolean flag
        const perTickStr = params[4].trim();
        let perTick = false;
        if (perTickStr === 'true') {
            perTick = true;
        } else if (perTickStr === 'false') {
            perTick = false;
        } else {
            throw new Error(`Unable to parse boolean flag in mekanism nucleosynthesizing recipe: ${perTickStr}`);
        }

        return {
            input: params[0],
            chemicalInput: params[1],
            output: params[2],
            duration: duration,
            perTick: perTick
        };
    }
}

module.exports = new NucleosynthesizingHandler();