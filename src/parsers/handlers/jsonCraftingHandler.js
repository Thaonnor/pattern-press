'use strict';

/**
 * @typedef {Object} JsonRecipeResult
 * @property {string} recipeId Recipe identifier extracted from the method call.
 * @property {string|null} recipeType CraftTweaker recipe type from the segment context.
 * @property {'addJsonRecipe'} format Handler format identifier for normalization.
 * @property {Object} data Parsed JSON recipe data with CraftTweaker syntax transformed to valid JSON.
 */

/**
 * Regular expression pattern to match unquoted property names in CraftTweaker JSON objects.
 * Matches property names that follow object/array separators and adds quotes around them.
 * @type {RegExp}
 */
const propertyNamePattern = /([{,]\s*)([A-Za-z0-9_]+):/g;

/**
 * Transforms CraftTweaker JSON syntax into valid JSON and parses it.
 *
 * CraftTweaker logs often contain JSON-like objects with unquoted property names
 * and single quotes instead of double quotes. This function normalizes the syntax
 * before parsing to ensure compatibility with standard JSON.parse().
 *
 * @param {string} candidate Raw JSON string from CraftTweaker log output.
 * @returns {Object} Parsed JSON object ready for recipe processing.
 * @throws {SyntaxError} When the transformed string is not valid JSON.
 */
function safeJsonParse(candidate) {
    let transformed = candidate.replace(propertyNamePattern, '$1"$2":');
    transformed = transformed.replace(/'/g, '"');

    return JSON.parse(transformed);
}

/**
 * Recipe handler for CraftTweaker addJsonRecipe method calls.
 *
 * This handler processes recipe segments containing calls to addJsonRecipe methods
 * on recipe type objects (e.g., `<recipetype:create:mixing>.addJsonRecipe(...)`).
 * It extracts the recipe identifier and parses the JSON recipe data for further
 * processing by the recipe normalization pipeline.
 */
module.exports = {
    name: 'json-crafting-handler',

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * Returns a positive score when the segment contains an addJsonRecipe method call.
     * The score is used by the dispatcher to select the appropriate handler for parsing.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context] Additional context from the dispatcher (unused).
     * @returns {number} Compatibility score: 1 if segment contains addJsonRecipe, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('.addJsonRecipe(') ? 1 : 0;
    },

    /**
     * Extracts recipe data from an addJsonRecipe method call segment.
     *
     * Parses the method call to extract the recipe identifier and JSON data payload.
     * The JSON data is processed through safeJsonParse to handle CraftTweaker syntax
     * quirks before returning the structured result.
     *
     * @param {Object} segment Recipe segment containing addJsonRecipe call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @param {Object} [context] Additional parsing context from the dispatcher.
     * @returns {JsonRecipeResult} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected addJsonRecipe pattern.
     */
    parse(segment) {
        const match = segment.rawText.match(/<recipetype:[^>]+>\.addJsonRecipe\("([^"]+)",\s*([\s\S]+?)\);$/);

        if (!match) {
            throw new Error('Unable to match addJsonRecipe pattern');
        }

        const [, recipeId, rawData] = match;
        const parsedData = safeJsonParse(rawData.trim());

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: 'addJsonRecipe',
            data: parsedData
        };
    }
};

