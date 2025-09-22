'use strict';

/**
 * Base class for Mekanism recipe handlers.
 *
 * Provides common functionality for parsing Mekanism CraftTweaker recipe calls
 * that follow the pattern: <recipetype:mekanism:TYPE>.addRecipe("id", ...params);
 *
 * Subclasses should implement:
 * - recipeType: The Mekanism recipe type (e.g., 'activating', 'crushing')
 * - parseParameters(paramsString, recipeId): Parse the specific parameter pattern
 * - getFormat(): Return the format identifier for normalization
 */
class BaseMekanismHandler {
    constructor(recipeType, format) {
        if (!recipeType) {
            throw new Error('recipeType is required for Mekanism handlers');
        }
        if (!format) {
            throw new Error('format is required for Mekanism handlers');
        }

        this.recipeType = recipeType;
        this.format = format;
        this.name = `mekanism-${recipeType}-handler`;
    }

    /**
     * Evaluates whether this handler can process the given segment.
     *
     * @param {Object} segment Recipe segment from the log segmenter.
     * @param {string} segment.rawText Original log content for the segment.
     * @returns {number} Compatibility score: 1 if segment matches this recipe type, 0 otherwise.
     */
    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        const pattern = `<recipetype:mekanism:${this.recipeType}>.addRecipe(`;
        return segment.rawText.includes(pattern) ? 1 : 0;
    }

    /**
     * Extracts recipe data from a Mekanism recipe method call segment.
     *
     * @param {Object} segment Recipe segment containing the method call.
     * @param {string} segment.rawText Raw log content with the method call.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for context.
     * @returns {Object} Parsed recipe data ready for normalization.
     * @throws {Error} When the segment does not match the expected pattern.
     */
    parse(segment) {
        const pattern = `<recipetype:mekanism:${this.recipeType}>.addRecipe(`;

        // First, verify this is the correct recipe type
        if (!segment.rawText.includes(pattern)) {
            throw new Error(`Unable to match mekanism ${this.recipeType} recipe pattern`);
        }

        // Extract the parameters portion from the addRecipe call
        const regex = new RegExp(`<recipetype:mekanism:${this.recipeType}>\\.addRecipe\\((.*)\\);\\s*$`);
        const paramMatch = segment.rawText.match(regex);
        if (!paramMatch) {
            throw new Error(`Unable to match mekanism ${this.recipeType} recipe pattern`);
        }

        const paramsString = paramMatch[1];

        // Parse the recipe ID (first quoted parameter)
        const recipeIdMatch = paramsString.match(/^"([^"]+)"/);
        if (!recipeIdMatch) {
            throw new Error(`Unable to match mekanism ${this.recipeType} recipe pattern`);
        }
        const recipeId = recipeIdMatch[1];

        // Remove recipe ID and get remaining parameters
        let remaining = paramsString.substring(recipeIdMatch[0].length).trim();
        if (remaining.startsWith(',')) {
            remaining = remaining.substring(1).trim();
        }

        // Let the subclass parse the specific parameter pattern
        const parsedParams = this.parseParameters(remaining, recipeId);

        return {
            recipeId,
            recipeType: segment.recipeType,
            format: this.format,
            ...parsedParams
        };
    }

    /**
     * Parse the parameters specific to this recipe type.
     * Subclasses must implement this method.
     *
     * @param {string} paramsString The parameter string after the recipe ID
     * @param {string} recipeId The recipe ID for context
     * @returns {Object} Object containing parsed parameters (input, output, etc.)
     * @throws {Error} When parameters don't match the expected pattern
     */
    parseParameters(paramsString, recipeId) {
        throw new Error(`parseParameters must be implemented by ${this.constructor.name}`);
    }

    /**
     * Helper method to split parameters by commas, respecting nested brackets/parentheses.
     * Useful for recipes with multiple parameters.
     *
     * @param {string} paramsString String containing comma-separated parameters
     * @returns {string[]} Array of trimmed parameter strings
     */
    splitParameters(paramsString) {
        const params = [];
        let current = '';
        let depth = 0;
        let inTag = false;

        for (let i = 0; i < paramsString.length; i++) {
            const char = paramsString[i];

            if (char === '<') {
                inTag = true;
            } else if (char === '>') {
                inTag = false;
            } else if (char === '(' && !inTag) {
                depth++;
            } else if (char === ')' && !inTag) {
                depth--;
            } else if (char === ',' && depth === 0 && !inTag) {
                params.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            params.push(current.trim());
        }

        return params;
    }
}

module.exports = BaseMekanismHandler;