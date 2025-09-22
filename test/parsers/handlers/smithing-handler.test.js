const handler = require('../../../src/parsers/handlers/smithingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:smithing>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('smithingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('smithing-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with smithing.addTransformRecipe calls', () => {
            const segment = createTestSegment('smithing.addTransformRecipe("test", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 1 for segments with smithing.addTrimRecipe calls', () => {
            const segment = createTestSegment('smithing.addTrimRecipe("trim_test", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without smithing calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);',
                'smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);',
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
            expect(handler.canParse({ rawText: '' })).toBe(0);
        });
    });

    describe('parse - transform recipes', () => {
        test('extracts transform recipe data correctly', () => {
            const segment = createTestSegment(
                'smithing.addTransformRecipe("minecraft:netherite_sword", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('minecraft:netherite_sword');
            expect(result.recipeType).toBe('<recipetype:minecraft:smithing>');
            expect(result.format).toBe('addSmithingTransform');
            expect(result.output).toBe('<item:minecraft:netherite_sword>');
            expect(result.template).toBe('<item:minecraft:netherite_upgrade_smithing_template>');
            expect(result.base).toBe('<item:minecraft:diamond_sword>');
            expect(result.addition).toBe('<item:minecraft:netherite_ingot>');
        });

        test('handles real-world transform examples from log file', () => {
            const realExamples = [
                {
                    rawText: 'smithing.addTransformRecipe("sophisticatedbackpacks:netherite_backpack", <item:sophisticatedbackpacks:netherite_backpack>, <item:minecraft:netherite_upgrade_smithing_template>, <item:sophisticatedbackpacks:diamond_backpack>, <tag:item:c:ingots/netherite>);',
                    expectedId: 'sophisticatedbackpacks:netherite_backpack',
                    expectedOutput: '<item:sophisticatedbackpacks:netherite_backpack>',
                    expectedTemplate: '<item:minecraft:netherite_upgrade_smithing_template>',
                    expectedBase: '<item:sophisticatedbackpacks:diamond_backpack>',
                    expectedAddition: '<tag:item:c:ingots/netherite>'
                },
                {
                    rawText: 'smithing.addTransformRecipe("justdirethings:blazegold_axe-templateupgrade", <item:justdirethings:blazegold_axe>, <item:justdirethings:template_blazegold>, <item:justdirethings:ferricore_axe>, <item:justdirethings:blazegold_ingot>);',
                    expectedId: 'justdirethings:blazegold_axe-templateupgrade',
                    expectedOutput: '<item:justdirethings:blazegold_axe>',
                    expectedTemplate: '<item:justdirethings:template_blazegold>',
                    expectedBase: '<item:justdirethings:ferricore_axe>',
                    expectedAddition: '<item:justdirethings:blazegold_ingot>'
                }
            ];

            realExamples.forEach((example, index) => {
                const segment = createTestSegment(example.rawText);
                const result = handler.parse(segment);

                expect({
                    recipeId: result.recipeId,
                    output: result.output,
                    template: result.template,
                    base: result.base,
                    addition: result.addition,
                    format: result.format
                }).toEqual({
                    recipeId: example.expectedId,
                    output: example.expectedOutput,
                    template: example.expectedTemplate,
                    base: example.expectedBase,
                    addition: example.expectedAddition,
                    format: 'addSmithingTransform'
                });
            });
        });

        test('handles complex modded transform recipes', () => {
            const segment = createTestSegment(
                'smithing.addTransformRecipe("complexmod:upgrade_recipe", <item:complexmod:super_sword>, <item:complexmod:special_template>, <item:complexmod:base_sword>, <item:complexmod:rare_material>);'
            );

            const result = handler.parse(segment);

            expect(result.format).toBe('addSmithingTransform');
            expect(result.recipeId).toBe('complexmod:upgrade_recipe');
            expect(result.output).toBe('<item:complexmod:super_sword>');
        });

        test('handles tag-based inputs in transform recipes', () => {
            const segment = createTestSegment(
                'smithing.addTransformRecipe("tag_test", <item:minecraft:netherite_helmet>, <item:minecraft:netherite_upgrade_smithing_template>, <tag:item:minecraft:diamond_helmet>, <tag:item:c:ingots/netherite>);'
            );

            const result = handler.parse(segment);

            expect(result.base).toBe('<tag:item:minecraft:diamond_helmet>');
            expect(result.addition).toBe('<tag:item:c:ingots/netherite>');
        });
    });

    describe('parse - trim recipes', () => {
        test('extracts trim recipe data correctly', () => {
            const segment = createTestSegment(
                'smithing.addTrimRecipe("minecraft:bolt_armor_trim", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('minecraft:bolt_armor_trim');
            expect(result.recipeType).toBe('<recipetype:minecraft:smithing>');
            expect(result.format).toBe('addSmithingTrim');
            expect(result.template).toBe('<item:minecraft:bolt_armor_trim_smithing_template>');
            expect(result.base).toBe('<tag:item:minecraft:trimmable_armor>');
            expect(result.addition).toBe('<tag:item:minecraft:trim_materials>');
            expect(result.output).toBeUndefined(); // Trim recipes don't have explicit output
        });

        test('handles real-world trim examples from log file', () => {
            const realExamples = [
                {
                    rawText: 'smithing.addTrimRecipe("minecraft:bolt_armor_trim_smithing_template_smithing_trim", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);',
                    expectedId: 'minecraft:bolt_armor_trim_smithing_template_smithing_trim',
                    expectedTemplate: '<item:minecraft:bolt_armor_trim_smithing_template>',
                    expectedBase: '<tag:item:minecraft:trimmable_armor>',
                    expectedAddition: '<tag:item:minecraft:trim_materials>'
                },
                {
                    rawText: 'smithing.addTrimRecipe("minecraft:coast_armor_trim_smithing_template_smithing_trim", <item:minecraft:coast_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);',
                    expectedId: 'minecraft:coast_armor_trim_smithing_template_smithing_trim',
                    expectedTemplate: '<item:minecraft:coast_armor_trim_smithing_template>',
                    expectedBase: '<tag:item:minecraft:trimmable_armor>',
                    expectedAddition: '<tag:item:minecraft:trim_materials>'
                }
            ];

            realExamples.forEach((example, index) => {
                const segment = createTestSegment(example.rawText);
                const result = handler.parse(segment);

                expect({
                    recipeId: result.recipeId,
                    template: result.template,
                    base: result.base,
                    addition: result.addition,
                    format: result.format
                }).toEqual({
                    recipeId: example.expectedId,
                    template: example.expectedTemplate,
                    base: example.expectedBase,
                    addition: example.expectedAddition,
                    format: 'addSmithingTrim'
                });
            });
        });

        test('handles different trim template types', () => {
            const trimTypes = [
                'bolt', 'coast', 'dune', 'eye', 'flow', 'host',
                'raiser', 'rib', 'sentry', 'shaper', 'silence',
                'snout', 'spire', 'tide', 'vex', 'ward', 'wayfinder', 'wild'
            ];

            trimTypes.forEach(trimType => {
                const segment = createTestSegment(
                    `smithing.addTrimRecipe("minecraft:${trimType}_armor_trim", <item:minecraft:${trimType}_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);`
                );

                const result = handler.parse(segment);

                expect(result.format).toBe('addSmithingTrim');
                expect(result.template).toBe(`<item:minecraft:${trimType}_armor_trim_smithing_template>`);
            });
        });
    });

    describe('parse - error handling', () => {
        test('preserves whitespace handling in specifications', () => {
            const segment = createTestSegment(
                'smithing.addTransformRecipe("whitespace_test",   <item:minecraft:netherite_sword>  ,   <item:minecraft:netherite_upgrade_smithing_template>   ,   <item:minecraft:diamond_sword>   ,   <item:minecraft:netherite_ingot>   );'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:netherite_sword>');
            expect(result.template).toBe('<item:minecraft:netherite_upgrade_smithing_template>');
            expect(result.base).toBe('<item:minecraft:diamond_sword>');
            expect(result.addition).toBe('<item:minecraft:netherite_ingot>');
        });

        test('throws error for invalid recipe patterns', () => {
            const invalidPatterns = [
                'smithing.addTransformRecipe();', // no parameters
                'smithing.addTransformRecipe("incomplete", <item:test>);', // too few parameters
                'smithing.addTrimRecipe();', // no parameters for trim
                'smithing.addTrimRecipe("incomplete", <item:test>);', // too few parameters for trim
                'not a recipe at all', // completely wrong format
                'furnace.addRecipe("wrong_method", <item:test>, <item:test>, 0.7, 200);' // wrong method
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match smithing recipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'mod:complex_recipe_name_with_underscores',
                'namespace:very/complex/recipe/path',
                'sophisticatedbackpacks:netherite_backpack',
                'justdirethings:blazegold_axe-templateupgrade'
            ];

            testCases.forEach((recipeId) => {
                const transformSegment = createTestSegment(
                    `smithing.addTransformRecipe("${recipeId}", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);`
                );
                const trimSegment = createTestSegment(
                    `smithing.addTrimRecipe("${recipeId}", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);`
                );

                const transformResult = handler.parse(transformSegment);
                const trimResult = handler.parse(trimSegment);

                expect(transformResult.recipeId).toBe(recipeId);
                expect(trimResult.recipeId).toBe(recipeId);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validTransformSegment = createTestSegment('smithing.addTransformRecipe("test", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);');
            const validTrimSegment = createTestSegment('smithing.addTrimRecipe("test", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segments should be parsed successfully
            expect(handler.canParse(validTransformSegment)).toBe(1);
            expect(handler.canParse(validTrimSegment)).toBe(1);

            const transformResult = handler.parse(validTransformSegment);
            const trimResult = handler.parse(validTrimSegment);

            expect(transformResult.format).toBe('addSmithingTransform');
            expect(trimResult.format).toBe('addSmithingTrim');

            // Invalid segment should not be processed by this handler
            expect(handler.canParse(invalidSegment)).toBe(0);
        });

        test('works with different recipe types', () => {
            const segment = createTestSegment(
                'smithing.addTransformRecipe("test", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);',
                '<recipetype:minecraft:smithing>'
            );

            const result = handler.parse(segment);

            expect(result.recipeType).toBe('<recipetype:minecraft:smithing>');
        });

        test('maintains consistent format identifiers', () => {
            const transformSegment = createTestSegment('smithing.addTransformRecipe("test", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);');
            const trimSegment = createTestSegment('smithing.addTrimRecipe("test", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);');

            const transformResult = handler.parse(transformSegment);
            const trimResult = handler.parse(trimSegment);

            expect(transformResult.format).toBe('addSmithingTransform');
            expect(trimResult.format).toBe('addSmithingTrim');
        });

        test('distinguishes from other recipe methods', () => {
            const smithingTransformSegment = createTestSegment('smithing.addTransformRecipe("test", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);');
            const smithingTrimSegment = createTestSegment('smithing.addTrimRecipe("test", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);');
            const furnaceSegment = createTestSegment('furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);');
            const craftingSegment = createTestSegment('craftingTable.addShaped("test", <item:minecraft:stick>, []);');

            // Only smithing segments should be parseable
            expect(handler.canParse(smithingTransformSegment)).toBe(1);
            expect(handler.canParse(smithingTrimSegment)).toBe(1);
            expect(handler.canParse(furnaceSegment)).toBe(0);
            expect(handler.canParse(craftingSegment)).toBe(0);
        });

        test('handles both transform and trim recipes in mixed scenarios', () => {
            const segments = [
                createTestSegment('smithing.addTransformRecipe("upgrade1", <item:minecraft:netherite_sword>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_sword>, <item:minecraft:netherite_ingot>);'),
                createTestSegment('smithing.addTrimRecipe("trim1", <item:minecraft:bolt_armor_trim_smithing_template>, <tag:item:minecraft:trimmable_armor>, <tag:item:minecraft:trim_materials>);'),
                createTestSegment('smithing.addTransformRecipe("upgrade2", <item:minecraft:netherite_axe>, <item:minecraft:netherite_upgrade_smithing_template>, <item:minecraft:diamond_axe>, <item:minecraft:netherite_ingot>);')
            ];

            const results = segments.map(segment => {
                expect(handler.canParse(segment)).toBe(1);
                return handler.parse(segment);
            });

            expect(results[0].format).toBe('addSmithingTransform');
            expect(results[1].format).toBe('addSmithingTrim');
            expect(results[2].format).toBe('addSmithingTransform');

            expect(results[0].output).toBeDefined();
            expect(results[1].output).toBeUndefined(); // Trim recipes don't have output
            expect(results[2].output).toBeDefined();
        });
    });
});