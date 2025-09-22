'use strict';

const BaseMekanismHandler = require('./baseMekanismHandler');

/**
 * @typedef {Object} ChemicalInfusingRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addChemicalInfusing'} format Handler format identifier for normalization.
 * @property {string} leftInput Raw left chemical input specification.
 * @property {string} rightInput Raw right chemical input specification.
 * @property {string} output Raw chemical output specification.
 */

/**
 * Recipe handler for Mekanism chemical infusing recipes.
 *
 * This handler processes recipe segments containing calls to
 * <recipetype:mekanism:chemical_infusing>.addRecipe() methods. Chemical infusing
 * recipes define operations performed by the Chemical Infuser to combine
 * two chemicals into a new chemical compound.
 *
 * These recipes are used by Mekanism's Chemical Infuser to create
 * complex chemicals from simpler ones. The infusing process specifies:
 * - Left chemical input
 * - Right chemical input
 * - Chemical output (result of infusion)
 */
class ChemicalInfusingHandler extends BaseMekanismHandler {
    constructor() {
        super('chemical_infusing', 'addChemicalInfusing');
    }

    /**
     * Parse chemical infusing recipe parameters: left_chemical, right_chemical, output_chemical
     *
     * Expected pattern: <left_chemical>, <right_chemical>, <output_chemical>
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
            throw new Error(`Unable to match mekanism chemical infusing recipe pattern - expected 3 parameters, got ${params.length}`);
        }

        return {
            leftInput: params[0],
            rightInput: params[1],
            output: params[2]
        };
    }
}

module.exports = new ChemicalInfusingHandler();