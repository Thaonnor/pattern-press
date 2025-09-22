'use strict';

/**
 * @typedef {Object} OutputSpecResult
 * @property {string|null} raw Base item specification without multiplier.
 * @property {number} count Stack count extracted from multiplier (defaults to 1).
 */

/**
 * @typedef {Object} ShapelessRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addShapeless'} format Handler format identifier for normalization.
 * @property {string} output Raw output specification as written in the log.
 * @property {OutputSpecResult} outputParsed Structured output with item and count separated.
 * @property {string} ingredients Raw ingredients specification from the method call.
 */

/**
 * Parses CraftTweaker output specifications to extract item and count information.
 *
 * Output specifications in CraftTweaker can include optional stack multipliers using
 * the `* count` syntax (e.g., `<item:minecraft:stick> * 4`). This function separates
 * the base item specification from the count for easier processing.
 *
 * @param {string} spec Raw output specification from CraftTweaker method call.
 * @returns {OutputSpecResult} Parsed output with separate item and count components.
 */
function parseOutputSpec(spec) {
    if (!spec) {
        return { raw: null, count: 1 };
    }

    const trimmed = spec.trim();
    const multiplierMatch = trimmed.match(/^(.*?)(?:\s*\*\s*(\d+))?$/);

    if (!multiplierMatch) {
        return { raw: trimmed, count: 1 };
    }

    const base = multiplierMatch[1].trim();
    const count = multiplierMatch[2] ? Number.parseInt(multiplierMatch[2], 10) : 1;

    return {
        raw: base,
        count: Number.isNaN(count) ? 1 : count
    };
}

/**
 * Recipe handler for CraftTweaker shapeless crafting table recipes.
 *
 * This handler processes recipe segments containing calls to craftingTable.addShapeless()
 * methods. Shapeless recipes define ingredients that can be placed in any arrangement
 * within the crafting grid to produce the specified output, unlike shaped recipes which
 * require specific positioning.
 */
module.exports = {
    name: 'shapeless-crafting-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a craftingTable.addShapeless call.
     * The score is used by the dispatcher to select the appropriate handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains addShapeless, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('craftingTable.addShapeless(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a craftingTable.addShapeless method call segment.
     *
     * Parses the method call to extract the recipe identifier, output specification,
     * and ingredients list. The output specification is further processed to separate
     * the item from any stack count multiplier.
     *
     * @param {Object} segment Recipe segment containing addShapeless call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {ShapelessRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected addShapeless pattern.
     */
    parse(segment) {
        const match = segment.rawText.match(/craftingTable\.addShapeless\("([^"]+)",\s*([^,]+),\s*([\s\S]+?)\);\s*$/);

        if (!match) {
            throw new Error('Unable to match addShapeless pattern');
        }

        const [, recipeId, outputSpec, ingredientsRaw] = match;
        const output = parseOutputSpec(outputSpec);

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addShapeless',
            output: outputSpec.trim(),
            outputParsed: output,
            ingredients: ingredientsRaw.trim()
        };
    }
};
