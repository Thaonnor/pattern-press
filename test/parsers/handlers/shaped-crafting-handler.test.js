const handler = require('../../../src/parsers/handlers/shapedCraftingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:crafting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 3
    };
}

describe('shapedCraftingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('shaped-crafting-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with addShaped calls', () => {
            const segment = createTestSegment('craftingTable.addShaped("test", <item:minecraft:stick>, []);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without addShaped calls', () => {
            const testCases = [
                'craftingTable.addShapeless("test", <item:minecraft:stick>, []);',
                '<recipetype:create:mixing>.addJsonRecipe("test", {});',
                'some other log content'
            ];

            testCases.forEach((rawText, index) => {
                const segment = createTestSegment(rawText);
                const score = handler.canParse(segment);
                expect(score).toBe(0);
            });
        });

        test('handles invalid segment input', () => {
            expect(handler.canParse(null)).toBe(0);
            expect(handler.canParse({})).toBe(0);
            expect(handler.canParse({ rawText: null })).toBe(0);
        });
    });

    describe('parse', () => {
        test('extracts basic recipe components', () => {
            const rawText = 'craftingTable.addShaped("test_recipe", <item:minecraft:stick>, ["A", "A", "A"]);';
            const segment = createTestSegment(rawText, '<recipetype:minecraft:crafting>');

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('test_recipe');
            expect(result.recipeType).toBe('<recipetype:minecraft:crafting>');
            expect(result.format).toBe('addShaped');
            expect(result.output).toBe('<item:minecraft:stick>');
            expect(result.outputParsed.raw).toBe('<item:minecraft:stick>');
            expect(result.outputParsed.count).toBe(1);
        });

        test('handles output specifications with multipliers', () => {
            const testCases = [
                { spec: '<item:minecraft:stick> * 4', expectedRaw: '<item:minecraft:stick>', expectedCount: 4 },
                { spec: '<item:minecraft:iron_ingot>*2', expectedRaw: '<item:minecraft:iron_ingot>', expectedCount: 2 },
                { spec: '<item:test> * 10', expectedRaw: '<item:test>', expectedCount: 10 },
                { spec: '<item:minecraft:diamond>', expectedRaw: '<item:minecraft:diamond>', expectedCount: 1 }
            ];

            testCases.forEach(({ spec, expectedRaw, expectedCount }) => {
                const rawText = `craftingTable.addShaped("test", ${spec}, ["A"]);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.outputParsed).toEqual({ raw: expectedRaw, count: expectedCount });
            });
        });

        test('handles malformed multipliers gracefully', () => {
            const testCases = [
                '<item:minecraft:stick> * invalid',
                '<item:minecraft:stick> * NaN',
                '<item:minecraft:stick> *'
            ];

            testCases.forEach((spec) => {
                const rawText = `craftingTable.addShaped("test", ${spec}, ["A"]);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.outputParsed.count).toBe(1);
            });
        });

        test('extracts crafting patterns correctly', () => {
            const patterns = [
                '["AAA", "ABA", "AAA"]',
                '[" A ", " B ", " A "]',
                '["AB", "BA"]'
            ];

            patterns.forEach((pattern) => {
                const rawText = `craftingTable.addShaped("test", <item:test>, ${pattern});`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.pattern).toBe(pattern);
            });
        });

        test('handles multiline patterns', () => {
            const rawText = `craftingTable.addShaped("multiline_recipe", <item:minecraft:crafting_table>, [
        "AAA",
        "A A",
        "AAA"
    ]);`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.pattern).toContain('"AAA"');
        });

        test('handles complex recipe patterns with mappings', () => {
            const patternData = `[
        "ABA",
        "CDC",
        "ABA"
    ], {
        A: <item:minecraft:iron_ingot>,
        B: <item:minecraft:diamond>,
        C: <item:minecraft:stick>,
        D: <item:minecraft:redstone>
    }`;
            const rawText = `craftingTable.addShaped("complex_recipe", <item:minecraft:diamond_pickaxe>, ${patternData});`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.pattern).toContain('<item:minecraft:diamond>');
        });

        test('throws error for invalid addShaped pattern', () => {
            const invalidCases = [
                'not a recipe call at all',
                'craftingTable.addShaped();',  // missing parameters
                'craftingTable.addShaped("test");',  // missing output and pattern
                'addShaped("test", <item:test>, []);'  // missing craftingTable prefix
            ];

            invalidCases.forEach((rawText) => {
                const segment = createTestSegment(rawText);
                expect(() => handler.parse(segment)).toThrow(/Unable to match addShaped pattern/);
            });
        });

        test('preserves recipe type context from segment', () => {
            const rawText = 'craftingTable.addShaped("test", <item:minecraft:stick>, ["A"]);';
            const segment1 = createTestSegment(rawText, '<recipetype:minecraft:crafting>');
            const segment2 = createTestSegment(rawText, null);

            const result1 = handler.parse(segment1);
            const result2 = handler.parse(segment2);

            expect(result1.recipeType).toBe('<recipetype:minecraft:crafting>');
            expect(result2.recipeType).toBe(null);
        });

        test('handles recipe IDs with special characters', () => {
            const testCases = [
                { id: 'simple_recipe', expected: 'simple_recipe' },
                { id: 'namespace:recipe_name', expected: 'namespace:recipe_name' },
                { id: 'recipe-with-hyphens_and_underscores', expected: 'recipe-with-hyphens_and_underscores' }
            ];

            testCases.forEach(({ id, expected }) => {
                const rawText = `craftingTable.addShaped("${id}", <item:test>, []);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);
                expect(result.recipeId).toBe(expected);
            });
        });

        test('handles minimal valid output specifications', () => {
            // Test with a minimal valid output specification
            const validRawText = 'craftingTable.addShaped("test", <item:air>, ["A"]);';
            const validSegment = createTestSegment(validRawText);
            const result = handler.parse(validSegment);

            expect(result.outputParsed.raw).not.toBe(null);
        });

        test('handles whitespace in output specifications', () => {
            const rawText = 'craftingTable.addShaped("test",   <item:minecraft:stick>   *   4   , ["A"]);';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.outputParsed.raw).toBe('<item:minecraft:stick>');
            expect(result.outputParsed.count).toBe(4);
        });

        test('handles various item specification formats', () => {
            const itemFormats = [
                '<item:minecraft:stick>',
                '<tag:forge:ingots/iron>',
                '<item:modname:complex_item_name>',
                '<fluid:minecraft:water>'
            ];

            itemFormats.forEach((itemSpec) => {
                const rawText = `craftingTable.addShaped("test", ${itemSpec}, ["A"]);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.outputParsed.raw).toBe(itemSpec);
            });
        });

        test('handles zero multipliers', () => {
            const rawText = 'craftingTable.addShaped("test", <item:minecraft:stick> * 0, ["A"]);';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.outputParsed.count).toBe(0);
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('craftingTable.addShaped("test", <item:minecraft:stick>, ["A"]);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            const canParseValid = handler.canParse(validSegment);
            expect(canParseValid).toBe(1);

            // Invalid segment should not be processed by this handler
            const canParseInvalid = handler.canParse(invalidSegment);
            expect(canParseInvalid).toBe(0);
        });
    });
});