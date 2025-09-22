const handler = require('../../../src/parsers/handlers/chemicalConversionHandler');

function createTestSegment(rawText, recipeType = '<recipetype:mekanism:chemical_conversion>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('chemicalConversionHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('chemical-conversion-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with mekanism chemical conversion recipe calls', () => {
            const segment = createTestSegment('<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without chemical conversion recipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);',
                '<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:test>, <chemical:output>);',
                '<recipetype:farmersdelight:cooking>.addRecipe("test", <item:test>, []);',
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
        test('extracts basic chemical conversion recipe data correctly', () => {
            const segment = createTestSegment(
                '<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_conversion/carbon/from_coal", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('chemical_conversion/carbon/from_coal');
            expect(result.recipeType).toBe('<recipetype:mekanism:chemical_conversion>');
            expect(result.format).toBe('addChemicalConversion');
            expect(result.input).toBe('<item:minecraft:coal>');
            expect(result.output).toBe('<chemical:mekanism:carbon> * 10');
        });

        test('handles real-world examples from log file', () => {
            const realExamples = [
                {
                    rawText: '<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_conversion/bio/from_bio_fuel", <tag:item:c:fuels/bio>, <chemical:mekanism:bio> * 5);',
                    expectedId: 'chemical_conversion/bio/from_bio_fuel',
                    expectedInput: '<tag:item:c:fuels/bio>',
                    expectedOutput: '<chemical:mekanism:bio> * 5'
                },
                {
                    rawText: '<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_conversion/carbon/from_charcoal_block", <tag:item:c:storage_blocks/charcoal>, <chemical:mekanism:carbon> * 180);',
                    expectedId: 'chemical_conversion/carbon/from_charcoal_block',
                    expectedInput: '<tag:item:c:storage_blocks/charcoal>',
                    expectedOutput: '<chemical:mekanism:carbon> * 180'
                },
                {
                    rawText: '<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_conversion/diamond/from_dust", <tag:item:c:dusts/diamond>, <chemical:mekanism:diamond> * 10);',
                    expectedId: 'chemical_conversion/diamond/from_dust',
                    expectedInput: '<tag:item:c:dusts/diamond>',
                    expectedOutput: '<chemical:mekanism:diamond> * 10'
                }
            ];

            realExamples.forEach((example, index) => {
                const segment = createTestSegment(example.rawText);
                const result = handler.parse(segment);

                expect({
                    recipeId: result.recipeId,
                    input: result.input,
                    output: result.output,
                    format: result.format
                }).toEqual({
                    recipeId: example.expectedId,
                    input: example.expectedInput,
                    output: example.expectedOutput,
                    format: 'addChemicalConversion'
                });
            });
        });

        test('handles tag-based inputs', () => {
            const tagExamples = [
                '<tag:item:c:fuels/bio>',
                '<tag:item:c:storage_blocks/charcoal>',
                '<tag:item:c:dusts/diamond>',
                '<tag:item:mekanism:enriched/carbon>'
            ];

            tagExamples.forEach(tagInput => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("tag_test", ${tagInput}, <chemical:mekanism:test> * 5);`
                );

                const result = handler.parse(segment);

                expect(result.input).toBe(tagInput);
                expect(result.format).toBe('addChemicalConversion');
            });
        });

        test('handles OR chains in inputs', () => {
            const segment = createTestSegment(
                '<recipetype:mekanism:chemical_conversion>.addRecipe("or_chain_test", <item:ftbmaterials:charcoal_dust> | <item:mekanism:dust_charcoal> | <item:minecraft:charcoal>, <chemical:mekanism:carbon> * 20);'
            );

            const result = handler.parse(segment);

            expect(result.input).toBe('<item:ftbmaterials:charcoal_dust> | <item:mekanism:dust_charcoal> | <item:minecraft:charcoal>');
            expect(result.output).toBe('<chemical:mekanism:carbon> * 20');
        });

        test('handles complex OR chains with multiple items', () => {
            const segment = createTestSegment(
                '<recipetype:mekanism:chemical_conversion>.addRecipe("complex_or_test", <item:ftbmaterials:coal_dust> | <item:oritech:coal_dust> | <item:mekanism:dust_coal> | <item:modern_industrialization:coal_dust> | <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);'
            );

            const result = handler.parse(segment);

            expect(result.input).toBe('<item:ftbmaterials:coal_dust> | <item:oritech:coal_dust> | <item:mekanism:dust_coal> | <item:modern_industrialization:coal_dust> | <item:minecraft:coal>');
            expect(result.output).toBe('<chemical:mekanism:carbon> * 10');
        });

        test('handles different chemical outputs with varying quantities', () => {
            const chemicalExamples = [
                { chemical: '<chemical:mekanism:bio> * 5', expectedOutput: '<chemical:mekanism:bio> * 5' },
                { chemical: '<chemical:mekanism:carbon> * 180', expectedOutput: '<chemical:mekanism:carbon> * 180' },
                { chemical: '<chemical:mekanism:diamond> * 10', expectedOutput: '<chemical:mekanism:diamond> * 10' },
                { chemical: '<chemical:mekanism:oxygen> * 10', expectedOutput: '<chemical:mekanism:oxygen> * 10' },
                { chemical: '<chemical:mekanism:carbon> * 80', expectedOutput: '<chemical:mekanism:carbon> * 80' }
            ];

            chemicalExamples.forEach(({ chemical, expectedOutput }, index) => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_test_${index}", <item:minecraft:test>, ${chemical});`
                );

                const result = handler.parse(segment);

                expect(result.output).toBe(expectedOutput);
            });
        });

        test('handles different types of input materials', () => {
            const materialTypes = [
                {
                    name: 'fuel_items',
                    input: '<tag:item:c:fuels/bio>',
                    output: '<chemical:mekanism:bio> * 45'
                },
                {
                    name: 'dust_items',
                    input: '<tag:item:c:dusts/diamond>',
                    output: '<chemical:mekanism:diamond> * 10'
                },
                {
                    name: 'storage_blocks',
                    input: '<tag:item:c:storage_blocks/coal>',
                    output: '<chemical:mekanism:carbon> * 90'
                },
                {
                    name: 'enriched_materials',
                    input: '<tag:item:mekanism:enriched/carbon>',
                    output: '<chemical:mekanism:carbon> * 80'
                }
            ];

            materialTypes.forEach(material => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_conversion/${material.name}", ${material.input}, ${material.output});`
                );

                const result = handler.parse(segment);

                expect(result.input).toBe(material.input);
                expect(result.output).toBe(material.output);
            });
        });

        test('preserves whitespace handling in specifications', () => {
            const segment = createTestSegment(
                '<recipetype:mekanism:chemical_conversion>.addRecipe("whitespace_test",   <item:minecraft:coal>  ,   <chemical:mekanism:carbon> * 10   );'
            );

            const result = handler.parse(segment);

            expect(result.input).toBe('<item:minecraft:coal>');
            expect(result.output).toBe('<chemical:mekanism:carbon> * 10');
        });

        test('handles modded items with complex namespaces', () => {
            const moddedExamples = [
                {
                    input: '<item:ftbmaterials:charcoal_dust>',
                    output: '<chemical:mekanism:carbon> * 20'
                },
                {
                    input: '<item:modern_industrialization:coal_dust>',
                    output: '<chemical:mekanism:carbon> * 10'
                },
                {
                    input: '<item:oritech:coal_dust>',
                    output: '<chemical:mekanism:carbon> * 10'
                }
            ];

            moddedExamples.forEach(({ input, output }, index) => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("modded_test_${index}", ${input}, ${output});`
                );

                const result = handler.parse(segment);

                expect(result.input).toBe(input);
                expect(result.output).toBe(output);
            });
        });

        test('throws error for invalid recipe patterns', () => {
            const invalidPatterns = [
                '<recipetype:mekanism:chemical_conversion>.addRecipe();', // no parameters
                '<recipetype:mekanism:chemical_conversion>.addRecipe("incomplete");', // too few parameters
                '<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:test>);', // still too few
                'not a recipe at all', // completely wrong format
                '<recipetype:mekanism:centrifuging>.addRecipe("wrong_type", <chemical:test>, <chemical:output>);' // wrong recipe type
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match mekanism chemical conversion recipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'chemical_conversion/bio/from_bio_fuel',
                'chemical_conversion/carbon/from_charcoal_block',
                'processing/materials/diamond_dissolution',
                'conversion/fuel/bio_processing'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("${recipeId}", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });

        test('handles different chemical types and quantities', () => {
            const chemicalTypes = [
                { chemical: 'bio', quantity: 5 },
                { chemical: 'carbon', quantity: 180 },
                { chemical: 'diamond', quantity: 10 },
                { chemical: 'oxygen', quantity: 10 },
                { chemical: 'carbon', quantity: 80 }
            ];

            chemicalTypes.forEach(({ chemical, quantity }, index) => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("chemical_${index}", <item:minecraft:test>, <chemical:mekanism:${chemical}> * ${quantity});`
                );

                const result = handler.parse(segment);

                expect(result.output).toBe(`<chemical:mekanism:${chemical}> * ${quantity}`);
            });
        });

        test('handles mekanism-specific input formats', () => {
            const mekanismInputs = [
                '<tag:item:mekanism:enriched/carbon>',
                '<tag:item:mekanism:enriched/diamond>',
                '<item:mekanism:dust_charcoal>',
                '<item:mekanism:dust_coal>'
            ];

            mekanismInputs.forEach((input, index) => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("mekanism_input_${index}", ${input}, <chemical:mekanism:test> * 10);`
                );

                const result = handler.parse(segment);

                expect(result.input).toBe(input);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            expect(handler.canParse(validSegment)).toBe(1);

            const parsedResult = handler.parse(validSegment);
            expect(parsedResult.format).toBe('addChemicalConversion');

            // Invalid segment should not be processed by this handler
            expect(handler.canParse(invalidSegment)).toBe(0);
        });

        test('works with different recipe types', () => {
            const segment = createTestSegment(
                '<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);',
                '<recipetype:mekanism:chemical_conversion>'
            );

            const result = handler.parse(segment);

            expect(result.recipeType).toBe('<recipetype:mekanism:chemical_conversion>');
        });

        test('maintains consistent format identifier', () => {
            const segment = createTestSegment('<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);');
            const result = handler.parse(segment);

            expect(result.format).toBe('addChemicalConversion');
        });

        test('distinguishes from other mekanism recipe types', () => {
            const conversionSegment = createTestSegment('<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:minecraft:coal>, <chemical:mekanism:carbon> * 10);');
            const centrifugingSegment = createTestSegment('<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:input>, <chemical:output>);');
            const activatingSegment = createTestSegment('<recipetype:mekanism:activating>.addRecipe("test", <chemical:input>, <chemical:output>);');

            // Only conversion segment should be parseable by this handler
            expect(handler.canParse(conversionSegment)).toBe(1);
            expect(handler.canParse(centrifugingSegment)).toBe(0);
            expect(handler.canParse(activatingSegment)).toBe(0);
        });

        test('extracts all required data fields for further processing', () => {
            const segment = createTestSegment('<recipetype:mekanism:chemical_conversion>.addRecipe("complete_test", <tag:item:c:fuels/bio>, <chemical:mekanism:bio> * 45);');
            const result = handler.parse(segment);

            // Verify all expected fields are present
            expect(result).toHaveProperty('recipeId');
            expect(result).toHaveProperty('recipeType');
            expect(result).toHaveProperty('format');
            expect(result).toHaveProperty('input');
            expect(result).toHaveProperty('output');

            // Verify they have expected values
            expect(typeof result.recipeId).toBe('string');
            expect(result.format).toBe('addChemicalConversion');
            expect(result.input.includes('item:') || result.input.includes('tag:')).toBe(true);
            expect(result.output.includes('chemical:')).toBe(true);
            expect(result.output.includes('*')).toBe(true);
        });

        test('handles chemical conversion workflow patterns', () => {
            const workflowPatterns = [
                {
                    stage: 'raw_material_to_chemical',
                    input: '<item:minecraft:coal>',
                    output: '<chemical:mekanism:carbon> * 10'
                },
                {
                    stage: 'dust_to_chemical',
                    input: '<tag:item:c:dusts/diamond>',
                    output: '<chemical:mekanism:diamond> * 10'
                },
                {
                    stage: 'enriched_to_chemical',
                    input: '<tag:item:mekanism:enriched/carbon>',
                    output: '<chemical:mekanism:carbon> * 80'
                }
            ];

            workflowPatterns.forEach(pattern => {
                const segment = createTestSegment(
                    `<recipetype:mekanism:chemical_conversion>.addRecipe("workflow/${pattern.stage}", ${pattern.input}, ${pattern.output});`
                );

                const result = handler.parse(segment);

                expect(result.input).toBe(pattern.input);
                expect(result.output).toBe(pattern.output);
                expect(result.format).toBe('addChemicalConversion');
            });
        });
    });
});