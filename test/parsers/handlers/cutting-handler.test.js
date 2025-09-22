const handler = require('../../../src/parsers/handlers/cuttingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:farmersdelight:cutting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('cuttingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('cutting-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with farmersdelight cutting recipe calls', () => {
            const segment = createTestSegment('<recipetype:farmersdelight:cutting>.addRecipe("test", <item:minecraft:apple>, [(<item:minecraft:apple_slice>)], <tag:item:c:tools/knife>, Optional.empty);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without cutting recipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);',
                '<recipetype:farmersdelight:cooking>.addRecipe("test", <item:test>, []);',
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

    describe('parse', () => {
        test('extracts basic cutting recipe data correctly', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("farmersdelight:cutting/apple", <item:minecraft:apple>, [(<item:minecraft:apple_slice> * 2).mutable()], <tag:item:c:tools/knife>, Optional.empty);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('farmersdelight:cutting/apple');
            expect(result.recipeType).toBe('<recipetype:farmersdelight:cutting>');
            expect(result.format).toBe('addCutting');
            expect(result.input).toBe('<item:minecraft:apple>');
            expect(result.outputs).toBe('[(<item:minecraft:apple_slice> * 2).mutable()]');
            expect(result.tool).toBe('<tag:item:c:tools/knife>');
            expect(result.optional).toBe('Optional.empty');
        });

        test('handles real-world examples from log file', () => {
            const realExamples = [
                {
                    rawText: '<recipetype:farmersdelight:cutting>.addRecipe("farmersdelight:cutting/acacia_door", <item:minecraft:acacia_door>, [(<item:minecraft:acacia_planks>).mutable()], <item:minecraft:wooden_axe> | <item:minecraft:iron_axe>, Optional.empty);',
                    expectedId: 'farmersdelight:cutting/acacia_door',
                    expectedInput: '<item:minecraft:acacia_door>',
                    expectedOutputs: '[(<item:minecraft:acacia_planks>).mutable()]',
                    expectedTool: '<item:minecraft:wooden_axe> | <item:minecraft:iron_axe>',
                    expectedOptional: 'Optional.empty'
                },
                {
                    rawText: '<recipetype:farmersdelight:cutting>.addRecipe("farmersdelight:cutting/acacia_log", <item:minecraft:acacia_log>, [(<item:minecraft:stripped_acacia_log>).mutable(), (<item:farmersdelight:tree_bark>).mutable()], <tag:item:c:tools/axe>, Optional.empty);',
                    expectedId: 'farmersdelight:cutting/acacia_log',
                    expectedInput: '<item:minecraft:acacia_log>',
                    expectedOutputs: '[(<item:minecraft:stripped_acacia_log>).mutable(), (<item:farmersdelight:tree_bark>).mutable()]',
                    expectedTool: '<tag:item:c:tools/axe>',
                    expectedOptional: 'Optional.empty'
                }
            ];

            realExamples.forEach((example, index) => {
                const segment = createTestSegment(example.rawText);
                const result = handler.parse(segment);

                expect({
                    recipeId: result.recipeId,
                    input: result.input,
                    outputs: result.outputs,
                    tool: result.tool,
                    optional: result.optional,
                    format: result.format
                }).toEqual({
                    recipeId: example.expectedId,
                    input: example.expectedInput,
                    outputs: example.expectedOutputs,
                    tool: example.expectedTool,
                    optional: example.expectedOptional,
                    format: 'addCutting'
                });
            });
        });

        test('handles complex tool OR chains', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("complex_tool_test", <item:minecraft:log>, [(<item:minecraft:planks> * 4).mutable()], <item:minecraft:wooden_axe> | <item:minecraft:stone_axe> | <item:minecraft:iron_axe> | <item:minecraft:diamond_axe>, Optional.empty);'
            );

            const result = handler.parse(segment);

            expect(result.tool).toBe('<item:minecraft:wooden_axe> | <item:minecraft:stone_axe> | <item:minecraft:iron_axe> | <item:minecraft:diamond_axe>');
            expect(result.format).toBe('addCutting');
        });

        test('handles multiple outputs with different quantities', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("multi_output_test", <item:minecraft:cake>, [(<item:minecraft:cake_slice> * 7).mutable(), (<item:minecraft:sugar>).mutable()], <tag:item:c:tools/knife>, Optional.empty);'
            );

            const result = handler.parse(segment);

            expect(result.outputs).toBe('[(<item:minecraft:cake_slice> * 7).mutable(), (<item:minecraft:sugar>).mutable()]');
            expect(result.input).toBe('<item:minecraft:cake>');
        });

        test('handles tag-based tools', () => {
            const tagExamples = [
                '<tag:item:c:tools/knife>',
                '<tag:item:c:tools/axe>',
                '<tag:item:minecraft:pickaxes>'
            ];

            tagExamples.forEach(toolTag => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cutting>.addRecipe("tag_test", <item:minecraft:apple>, [(<item:minecraft:apple_slice>).mutable()], ${toolTag}, Optional.empty);`
                );

                const result = handler.parse(segment);

                expect(result.tool).toBe(toolTag);
            });
        });

        test('handles different cutting board operations', () => {
            const operations = [
                {
                    name: 'wood_processing',
                    input: '<item:minecraft:oak_log>',
                    outputs: '[(<item:minecraft:stripped_oak_log>).mutable(), (<item:farmersdelight:tree_bark>).mutable()]',
                    tool: '<tag:item:c:tools/axe>'
                },
                {
                    name: 'flower_processing',
                    input: '<item:minecraft:rose_bush>',
                    outputs: '[(<item:minecraft:red_dye> * 3).mutable()]',
                    tool: '<tag:item:c:tools/knife>'
                },
                {
                    name: 'food_slicing',
                    input: '<item:farmersdelight:apple_pie>',
                    outputs: '[(<item:farmersdelight:apple_pie_slice> * 4).mutable()]',
                    tool: '<tag:item:c:tools/knife>'
                }
            ];

            operations.forEach(op => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cutting>.addRecipe("farmersdelight:cutting/${op.name}", ${op.input}, ${op.outputs}, ${op.tool}, Optional.empty);`
                );

                const result = handler.parse(segment);

                expect(result.input).toBe(op.input);
                expect(result.outputs).toBe(op.outputs);
                expect(result.tool).toBe(op.tool);
            });
        });

        test('preserves whitespace handling in specifications', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("whitespace_test",   <item:minecraft:apple>  ,   [(<item:minecraft:apple_slice>).mutable()]   ,   <tag:item:c:tools/knife>   ,   Optional.empty   );'
            );

            const result = handler.parse(segment);

            expect(result.input).toBe('<item:minecraft:apple>');
            expect(result.outputs).toBe('[(<item:minecraft:apple_slice>).mutable()]');
            expect(result.tool).toBe('<tag:item:c:tools/knife>');
            expect(result.optional).toBe('Optional.empty');
        });

        test('handles modded items and tools', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("modded_example", <item:farmersdelight:stuffed_pumpkin>, [(<item:farmersdelight:stuffed_pumpkin_block>).mutable(), (<item:minecraft:pumpkin_seeds> * 2).mutable()], <item:actuallyadditions:diamond_aiot> | <item:justdirethings:blazegold_axe>, Optional.empty);'
            );

            const result = handler.parse(segment);

            expect(result.input).toBe('<item:farmersdelight:stuffed_pumpkin>');
            expect(result.tool).toBe('<item:actuallyadditions:diamond_aiot> | <item:justdirethings:blazegold_axe>');
        });

        test('throws error for invalid recipe patterns', () => {
            const invalidPatterns = [
                '<recipetype:farmersdelight:cutting>.addRecipe();', // no parameters
                '<recipetype:farmersdelight:cutting>.addRecipe("incomplete");', // too few parameters
                '<recipetype:farmersdelight:cutting>.addRecipe("test", <item:test>);', // still too few
                'not a recipe at all', // completely wrong format
                '<recipetype:farmersdelight:cooking>.addRecipe("wrong_type", <item:test>, [], <tool>);' // wrong recipe type
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match farmersdelight cutting recipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'farmersdelight:cutting/complex_recipe_name',
                'modpack:cutting/very/deep/nested/path',
                'endersdelight:cutting/special-item_processing'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cutting>.addRecipe("${recipeId}", <item:minecraft:apple>, [(<item:minecraft:apple_slice>).mutable()], <tag:item:c:tools/knife>, Optional.empty);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });

        test('handles complex output arrays with mixed quantities and modifiers', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("complex_outputs", <item:minecraft:cake>, [(<item:minecraft:cake_slice> * 6).mutable(), (<item:minecraft:sugar> * 2).mutable(), (<item:minecraft:wheat>).mutable()], <tag:item:c:tools/knife>, Optional.empty);'
            );

            const result = handler.parse(segment);

            expect(result.outputs).toBe('[(<item:minecraft:cake_slice> * 6).mutable(), (<item:minecraft:sugar> * 2).mutable(), (<item:minecraft:wheat>).mutable()]');
        });

        test('handles very long tool OR chains from real log data', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("long_tool_chain", <item:minecraft:oak_log>, [(<item:minecraft:oak_planks>).mutable()], <item:minecraft:wooden_axe> | <item:minecraft:stone_axe> | <item:minecraft:iron_axe> | <item:minecraft:diamond_axe> | <item:minecraft:netherite_axe> | <item:actuallyadditions:wooden_aiot> | <item:actuallyadditions:iron_aiot> | <item:justdirethings:ferricore_axe>, Optional.empty);'
            );

            const result = handler.parse(segment);

            expect(result.tool).toContain('minecraft:wooden_axe');
            expect(result.tool).toContain('actuallyadditions:wooden_aiot');
            expect(result.tool).toContain('justdirethings:ferricore_axe');
            expect(result.tool.split('|').length).toBeGreaterThan(5);
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('<recipetype:farmersdelight:cutting>.addRecipe("test", <item:minecraft:apple>, [(<item:minecraft:apple_slice>).mutable()], <tag:item:c:tools/knife>, Optional.empty);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            expect(handler.canParse(validSegment)).toBe(1);

            const parsedResult = handler.parse(validSegment);
            expect(parsedResult.format).toBe('addCutting');

            // Invalid segment should not be processed by this handler
            expect(handler.canParse(invalidSegment)).toBe(0);
        });

        test('works with different recipe types', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cutting>.addRecipe("test", <item:minecraft:apple>, [(<item:minecraft:apple_slice>).mutable()], <tag:item:c:tools/knife>, Optional.empty);',
                '<recipetype:farmersdelight:cutting>'
            );

            const result = handler.parse(segment);

            expect(result.recipeType).toBe('<recipetype:farmersdelight:cutting>');
        });

        test('maintains consistent format identifier', () => {
            const segment = createTestSegment('<recipetype:farmersdelight:cutting>.addRecipe("test", <item:minecraft:apple>, [(<item:minecraft:apple_slice>).mutable()], <tag:item:c:tools/knife>, Optional.empty);');
            const result = handler.parse(segment);

            expect(result.format).toBe('addCutting');
        });

        test('distinguishes from other farmersdelight recipe types', () => {
            const cuttingSegment = createTestSegment('<recipetype:farmersdelight:cutting>.addRecipe("test", <item:minecraft:apple>, [(<item:minecraft:apple_slice>).mutable()], <tag:item:c:tools/knife>, Optional.empty);');
            const cookingSegment = createTestSegment('<recipetype:farmersdelight:cooking>.addRecipe("test", <item:test>, []);');
            const vanillaSegment = createTestSegment('furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);');

            // Only cutting segment should be parseable by this handler
            expect(handler.canParse(cuttingSegment)).toBe(1);
            expect(handler.canParse(cookingSegment)).toBe(0);
            expect(handler.canParse(vanillaSegment)).toBe(0);
        });

        test('extracts all required data fields for further processing', () => {
            const segment = createTestSegment('<recipetype:farmersdelight:cutting>.addRecipe("complete_test", <item:minecraft:cake>, [(<item:minecraft:cake_slice> * 7).mutable()], <tag:item:c:tools/knife>, Optional.empty);');
            const result = handler.parse(segment);

            // Verify all expected fields are present
            expect(result).toHaveProperty('recipeId');
            expect(result).toHaveProperty('recipeType');
            expect(result).toHaveProperty('format');
            expect(result).toHaveProperty('input');
            expect(result).toHaveProperty('outputs');
            expect(result).toHaveProperty('tool');
            expect(result).toHaveProperty('optional');

            // Verify they have expected values
            expect(typeof result.recipeId).toBe('string');
            expect(result.format).toBe('addCutting');
            expect(result.input.includes('item:')).toBe(true);
            expect(result.outputs.includes('[')).toBe(true);
            expect(result.optional).toBe('Optional.empty');
        });
    });
});