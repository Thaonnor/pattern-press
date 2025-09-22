'use strict';

/**
 * @typedef {Object} SmithingTransformRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addSmithingTransform'} format Handler format identifier for normalization.
 * @property {string} output Raw output specification as written in the log.
 * @property {string} template Raw template specification (smithing template item).
 * @property {string} base Raw base item specification (item being upgraded).
 * @property {string} addition Raw addition specification (upgrade material).
 */

/**
 * @typedef {Object} SmithingTrimRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addSmithingTrim'} format Handler format identifier for normalization.
 * @property {string} template Raw template specification (armor trim template).
 * @property {string} base Raw base specification (trimmable armor).
 * @property {string} addition Raw addition specification (trim materials).
 */

/**
 * Recipe handler for CraftTweaker smithing recipes.
 *
 * This handler processes recipe segments containing calls to smithing.addTransformRecipe()
 * and smithing.addTrimRecipe() methods. Smithing recipes define upgrade operations using
 * the smithing table, including equipment upgrades and armor trimming.
 *
 * Transform recipes upgrade items (e.g., diamond -> netherite gear) and require:
 * - Template (smithing template item)
 * - Base item (item being upgraded)
 * - Addition material (upgrade material)
 * - Output (resulting upgraded item)
 *
 * Trim recipes add decorative patterns to armor and require:
 * - Template (armor trim template)
 * - Base armor (trimmable armor pieces)
 * - Addition material (trim materials for coloring)
 */
module.exports = {
    name: 'smithing-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains smithing.addTransformRecipe
     * or smithing.addTrimRecipe calls. The score is used by the dispatcher to select
     * the appropriate handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains smithing recipes, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return (segment.rawText.includes('smithing.addTransformRecipe(') ||
                segment.rawText.includes('smithing.addTrimRecipe(')) ? 1 : 0;
    },

    /**
     * Extracts recipe data from smithing recipe method call segments.
     *
     * Handles both transform and trim recipes with different parameter structures:
     *
     * Transform recipes (5 parameters):
     * smithing.addTransformRecipe("id", <output>, <template>, <base>, <addition>);
     *
     * Trim recipes (4 parameters):
     * smithing.addTrimRecipe("id", <template>, <base>, <addition>);
     *
     * @param {Object} segment Recipe segment containing smithing method call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {SmithingTransformRecipeResult|SmithingTrimRecipeResult} Parsed recipe data.
     * @throws {Error} When the segment does not match expected smithing recipe patterns.
     */
    parse(segment) {
        // Try transform recipe pattern first (5 parameters)
        const transformMatch = segment.rawText.match(/smithing\.addTransformRecipe\("([^"]+)",\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\);\s*$/);

        if (transformMatch) {
            const [, recipeId, outputSpec, templateSpec, baseSpec, additionSpec] = transformMatch;

            return {
                recipeId,
                recipeType: segment.recipeType,
                format: 'addSmithingTransform',
                output: outputSpec.trim(),
                template: templateSpec.trim(),
                base: baseSpec.trim(),
                addition: additionSpec.trim()
            };
        }

        // Try trim recipe pattern (4 parameters)
        const trimMatch = segment.rawText.match(/smithing\.addTrimRecipe\("([^"]+)",\s*([^,]+),\s*([^,]+),\s*([^)]+)\);\s*$/);

        if (trimMatch) {
            const [, recipeId, templateSpec, baseSpec, additionSpec] = trimMatch;

            return {
                recipeId,
                recipeType: segment.recipeType,
                format: 'addSmithingTrim',
                template: templateSpec.trim(),
                base: baseSpec.trim(),
                addition: additionSpec.trim()
            };
        }

        throw new Error('Unable to match smithing recipe pattern');
    }
};