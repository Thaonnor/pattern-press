'use strict';

/**
 * @typedef {Object} OutputSpecResult
 * @property {string|null} raw Base item specification without multiplier.
 * @property {number} count Stack count extracted from multiplier (defaults to 1).
 */

/**
 * @typedef {Object} ShapedRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addShaped'} format Handler format identifier for normalization.
 * @property {string} output Raw output specification as written in the log.
 * @property {OutputSpecResult} outputParsed Structured output with item and count separated.
 * @property {string} pattern Raw crafting pattern specification from the method call.
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
        return {
            raw: null,
            count: 1
        };
    }

    const trimmed = spec.trim();
    const multiplierMatch = trimmed.match(/^(.*?)(?:\s*\*\s*(\d+))?$/);

    if (!multiplierMatch) {
        return {
            raw: trimmed,
            count: 1
        };
    }

    const base = multiplierMatch[1].trim();
    const count = multiplierMatch[2] ? Number.parseInt(multiplierMatch[2], 10) : 1;

    return {
        raw: base,
        count: Number.isNaN(count) ? 1 : count
    };
}

/**
 * Recipe handler for CraftTweaker shaped crafting table recipes.
 *
 * This handler processes recipe segments containing calls to craftingTable.addShaped()
 * methods. Shaped recipes define a specific pattern for ingredient placement in the
 * crafting grid, along with mappings from pattern characters to actual items.
 */
module.exports = {
    name: 'shaped-crafting-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains a craftingTable.addShaped call.
     * The score is used by the dispatcher to select the appropriate handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains addShaped, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('craftingTable.addShaped(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from a craftingTable.addShaped method call segment.
     *
     * Parses the method call to extract the recipe identifier, output specification,
     * and crafting pattern. The output specification is further processed to separate
     * the item from any stack count multiplier.
     *
     * @param {Object} segment Recipe segment containing addShaped call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {ShapedRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected addShaped pattern.
     */
    parse(segment) {
        const match = segment.rawText.match(/craftingTable\.addShaped\("([^"]+)",\s*([^,]+),\s*([\s\S]+?)\);\s*$/);

        if (!match) {
            throw new Error('Unable to match addShaped pattern');
        }

        const [, recipeId, outputSpec, patternRaw] = match;
        const output = parseOutputSpec(outputSpec);

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addShaped',
            output: outputSpec.trim(),
            outputParsed: output,
            pattern: patternRaw.trim()
        };
    }
};
