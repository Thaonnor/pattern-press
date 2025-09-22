const handler = require('../../../src/parsers/handlers/shapelessCraftingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:crafting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 3
    };
}

describe('shapelessCraftingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('shapeless-crafting-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with addShapeless calls', () => {
            const segment = createTestSegment('craftingTable.addShapeless("test", <item:minecraft:stick>, []);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without addShapeless calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
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
            const rawText = 'craftingTable.addShapeless("test_recipe", <item:minecraft:stick>, [<item:minecraft:planks>]);';
            const segment = createTestSegment(rawText, '<recipetype:minecraft:crafting>');

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('test_recipe');
            expect(result.recipeType).toBe('<recipetype:minecraft:crafting>');
            expect(result.format).toBe('addShapeless');
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
                const rawText = `craftingTable.addShapeless("test", ${spec}, [<item:test>]);`;
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
                const rawText = `craftingTable.addShapeless("test", ${spec}, [<item:test>]);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.outputParsed.count).toBe(1);
            });
        });

        test('extracts ingredients correctly', () => {
            const ingredientLists = [
                '[<item:minecraft:planks>]',
                '[<item:minecraft:iron_ingot>, <item:minecraft:stick>]',
                '[<tag:forge:ingots>, <item:minecraft:diamond>, <fluid:minecraft:water>]'
            ];

            ingredientLists.forEach((ingredients) => {
                const rawText = `craftingTable.addShapeless("test", <item:test>, ${ingredients});`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.ingredients).toBe(ingredients);
            });
        });

        test('handles multiline ingredients', () => {
            const rawText = `craftingTable.addShapeless("multiline_recipe", <item:minecraft:crafting_table>, [
        <item:minecraft:planks>,
        <item:minecraft:planks>,
        <item:minecraft:planks>,
        <item:minecraft:planks>
    ]);`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toContain('<item:minecraft:planks>');
        });

        test('handles complex ingredient specifications', () => {
            const complexIngredients = `[
        <tag:forge:dusts/redstone>,
        <item:minecraft:glowstone_dust>,
        <item:minecraft:ender_pearl>.withTag({display: {Name: "Special Pearl"}}),
        <fluid:minecraft:water> * 1000
    ]`;
            const rawText = `craftingTable.addShapeless("complex_recipe", <item:minecraft:ender_eye>, ${complexIngredients});`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toContain('<tag:forge:dusts/redstone>');
        });

        test('throws error for invalid addShapeless pattern', () => {
            const invalidCases = [
                'not a recipe call at all',
                'craftingTable.addShapeless();',  // missing parameters
                'craftingTable.addShapeless("test");',  // missing output and ingredients
                'addShapeless("test", <item:test>, []);'  // missing craftingTable prefix
            ];

            invalidCases.forEach((rawText) => {
                const segment = createTestSegment(rawText);
                expect(() => handler.parse(segment)).toThrow(/Unable to match addShapeless pattern/);
            });
        });

        test('preserves recipe type context from segment', () => {
            const rawText = 'craftingTable.addShapeless("test", <item:minecraft:stick>, [<item:test>]);';
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
                const rawText = `craftingTable.addShapeless("${id}", <item:test>, []);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);
                expect(result.recipeId).toBe(expected);
            });
        });

        test('handles whitespace in output specifications', () => {
            const rawText = 'craftingTable.addShapeless("test",   <item:minecraft:stick>   *   4   , [<item:test>]);';
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
                const rawText = `craftingTable.addShapeless("test", ${itemSpec}, [<item:test>]);`;
                const segment = createTestSegment(rawText);
                const result = handler.parse(segment);

                expect(result.outputParsed.raw).toBe(itemSpec);
            });
        });

        test('handles empty ingredients array', () => {
            const rawText = 'craftingTable.addShapeless("empty_ingredients", <item:minecraft:barrier>, []);';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toBe('[]');
        });

        test('handles single ingredient', () => {
            const rawText = 'craftingTable.addShapeless("single_ingredient", <item:minecraft:stick>, [<item:minecraft:planks>]);';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toBe('[<item:minecraft:planks>]');
        });

        test('handles ingredients with NBT data', () => {
            const ingredientsWithNBT = '[<item:minecraft:potion>.withTag({Potion: "minecraft:healing"}), <item:minecraft:sugar>]';
            const rawText = `craftingTable.addShapeless("potion_recipe", <item:minecraft:splash_potion>, ${ingredientsWithNBT});`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toContain('withTag');
        });

        test('handles ingredients with damage values', () => {
            const ingredientsWithDamage = '[<item:minecraft:iron_sword>.withDamage(10), <item:minecraft:iron_ingot>]';
            const rawText = `craftingTable.addShapeless("repair_recipe", <item:minecraft:iron_sword>, ${ingredientsWithDamage});`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toContain('withDamage');
        });

        test('handles zero multipliers', () => {
            const rawText = 'craftingTable.addShapeless("test", <item:minecraft:stick> * 0, [<item:test>]);';
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.outputParsed.count).toBe(0);
        });

        test('handles very large ingredient lists', () => {
            // Create a large ingredients list to test parsing performance and correctness
            const manyIngredients = Array.from({ length: 20 }, (_, i) => `<item:minecraft:item${i}>`).join(', ');
            const ingredientsList = `[${manyIngredients}]`;
            const rawText = `craftingTable.addShapeless("big_recipe", <item:minecraft:diamond>, ${ingredientsList});`;
            const segment = createTestSegment(rawText);

            const result = handler.parse(segment);

            expect(result.ingredients).toContain('item0');
            expect(result.ingredients).toContain('item19');
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('craftingTable.addShapeless("test", <item:minecraft:stick>, [<item:test>]);');
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