'use strict';

const propertyNamePattern = /([{,]\s*)([A-Za-z0-9_]+):/g;

function safeJsonParse(candidate) {
    let transformed = candidate.replace(propertyNamePattern, '$1"$2":');
    transformed = transformed.replace(/'/g, '"');

    return JSON.parse(transformed);
}

module.exports = {
    name: 'json-crafting-handler',

    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('.addJsonRecipe(') ? 1 : 0;
    },

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

