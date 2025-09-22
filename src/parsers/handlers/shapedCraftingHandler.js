'use strict';

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

module.exports = {
    name: 'shaped-crafting-handler',

    canParse(segment) {
        if (!segment?.rawText) {
            return 0;
        }

        return segment.rawText.includes('craftingTable.addShaped(') ? 1 : 0;
    },

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
