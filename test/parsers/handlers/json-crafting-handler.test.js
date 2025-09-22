const handler = require('../../../src/parsers/handlers/jsonCraftingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:create:mixing>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 2
    };
}

describe('jsonCraftingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('json-crafting-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with addJsonRecipe calls', () => {
            const segment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without addJsonRecipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>);',
                '<recipetype:minecraft:crafting>.addRecipe("test", {});',
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
        test('extracts recipe ID and data from valid segment', () => {
            const rawText = '<recipetype:create:mixing>.addJsonRecipe("test_recipe", {"type": "create:mixing", "ingredients": []});';
            const segment = createTestSegment(rawText, '<recipetype:create:mixing>');

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('test_recipe');
            expect(result.recipeType).toBe('<recipetype:create:mixing>');
            expect(result.format).toBe('addJsonRecipe');
            expect(result.data).toEqual({ type: 'create:mixing', ingredients: [] });
        });

        test('handles CraftTweaker JSON syntax with unquoted properties', () => {
            const rawText = '<recipetype:minecraft:crafting>.addJsonRecipe("test", {type: "minecraft:crafting", pattern: ["ABC"]});';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.data.type).toBe('minecraft:crafting');
            expect(result.data.pattern).toEqual(['ABC']);
        });

        test('handles CraftTweaker JSON syntax with single quotes', () => {
            const rawText = '<recipetype:test>.addJsonRecipe("recipe_id", {\'type\': \'test:recipe\'});';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.data.type).toBe('test:recipe');
        });

        test('handles complex nested JSON structures', () => {
            const jsonData = `{
                type: "create:mixing",
                ingredients: [
                    {item: "minecraft:iron_ingot", amount: 2},
                    {fluid: "minecraft:water", amount: 1000}
                ],
                results: [{item: "create:andesite_alloy", count: 1}],
                processingTime: 200
            }`;
            const rawText = `<recipetype:create:mixing>.addJsonRecipe("complex_recipe", ${jsonData});`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            const expected = {
                type: "create:mixing",
                ingredients: [
                    { item: "minecraft:iron_ingot", amount: 2 },
                    { fluid: "minecraft:water", amount: 1000 }
                ],
                results: [{ item: "create:andesite_alloy", count: 1 }],
                processingTime: 200
            };

            expect(result.data).toEqual(expected);
        });

        test('handles multiline JSON data', () => {
            const rawText = `<recipetype:create:pressing>.addJsonRecipe("multiline_recipe", {
                type: "create:pressing",
                ingredient: {
                    item: "minecraft:iron_ingot"
                },
                results: [
                    {
                        item: "create:iron_sheet",
                        count: 1
                    }
                ]
            });`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.data.type).toBe('create:pressing');
        });

        test('throws error for invalid addJsonRecipe pattern', () => {
            const invalidCases = [
                'not a recipe call at all',
                '<recipetype:test>.addJsonRecipe();',  // missing parameters
                'addJsonRecipe("test", {});'  // missing recipe type prefix
            ];

            invalidCases.forEach((rawText) => {
                const segment = createTestSegment(rawText);
                expect(() => handler.parse(segment)).toThrow(/Unable to match addJsonRecipe pattern/);
            });
        });

        test('throws error for invalid JSON data', () => {
            const rawText = '<recipetype:test>.addJsonRecipe("test", {invalid: json, syntax});';
            const segment = createTestSegment(rawText);

            expect(() => handler.parse(segment)).toThrow(/JSON/);
        });

        test('preserves recipe type context from segment', () => {
            const rawText = '<recipetype:create:sequenced_assembly>.addJsonRecipe("test", {type: "test"});';
            const segment1 = createTestSegment(rawText, '<recipetype:create:sequenced_assembly>');
            const segment2 = createTestSegment(rawText, null);

            const result1 = handler.parse(segment1);
            const result2 = handler.parse(segment2);

            expect(result1.recipeType).toBe('<recipetype:create:sequenced_assembly>');
            expect(result2.recipeType).toBe(null);
        });

        test('handles empty JSON objects', () => {
            const rawText = '<recipetype:test>.addJsonRecipe("empty_recipe", {});';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.data).toEqual({});
        });

        test('handles JSON arrays as root data', () => {
            const rawText = '<recipetype:test>.addJsonRecipe("array_recipe", [{item: "test", count: 1}]);';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.data).toEqual([{ item: "test", count: 1 }]);
        });

        test('extracts recipe IDs with special characters', () => {
            const testCases = [
                { id: 'simple_recipe', expected: 'simple_recipe' },
                { id: 'namespace:recipe_name', expected: 'namespace:recipe_name' },
                { id: 'recipe-with-hyphens_and_underscores', expected: 'recipe-with-hyphens_and_underscores' }
            ];

            testCases.forEach(({ id, expected }) => {
                const rawText = `<recipetype:test>.addJsonRecipe("${id}", {});`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);
                expect(result.recipeId).toBe(expected);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {type: "test"});');
            const invalidSegment = createTestSegment('craftingTable.addShaped("test", <item:test>);');

            // Valid segment should be parsed successfully
            const canParseValid = handler.canParse(validSegment);
            expect(canParseValid).toBe(1);

            // Invalid segment should not be processed by this handler
            const canParseInvalid = handler.canParse(invalidSegment);
            expect(canParseInvalid).toBe(0);
        });
    });
});