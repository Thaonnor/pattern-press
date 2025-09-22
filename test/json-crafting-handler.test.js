const test = require('tape');
const handler = require('../src/parsers/handlers/jsonCraftingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:create:mixing>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 2
    };
}

test('jsonCraftingHandler has required interface', (t) => {
    t.plan(3);

    t.equal(handler.name, 'json-crafting-handler', 'handler has correct name');
    t.equal(typeof handler.canParse, 'function', 'canParse method exists');
    t.equal(typeof handler.parse, 'function', 'parse method exists');
});

test('canParse returns 1 for segments with addJsonRecipe calls', (t) => {
    t.plan(1);

    const segment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');
    const score = handler.canParse(segment);

    t.equal(score, 1, 'returns positive score for addJsonRecipe segments');
});

test('canParse returns 0 for segments without addJsonRecipe calls', (t) => {
    t.plan(3);

    const testCases = [
        'craftingTable.addShaped("test", <item:minecraft:stick>);',
        '<recipetype:minecraft:crafting>.addRecipe("test", {});',
        'some other log content'
    ];

    testCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        const score = handler.canParse(segment);
        t.equal(score, 0, `returns zero score for non-addJsonRecipe segment ${index + 1}`);
    });
});

test('canParse handles invalid segment input', (t) => {
    t.plan(3);

    t.equal(handler.canParse(null), 0, 'handles null segment');
    t.equal(handler.canParse({}), 0, 'handles segment without rawText');
    t.equal(handler.canParse({ rawText: null }), 0, 'handles segment with null rawText');
});

test('parse extracts recipe ID and data from valid segment', (t) => {
    t.plan(4);

    const rawText = '<recipetype:create:mixing>.addJsonRecipe("test_recipe", {"type": "create:mixing", "ingredients": []});';
    const segment = createTestSegment(rawText, '<recipetype:create:mixing>');

    const result = handler.parse(segment);

    t.equal(result.recipeId, 'test_recipe', 'recipe ID extracted correctly');
    t.equal(result.recipeType, '<recipetype:create:mixing>', 'recipe type preserved from segment');
    t.equal(result.format, 'addJsonRecipe', 'format identifier set correctly');
    t.deepEqual(result.data, { type: 'create:mixing', ingredients: [] }, 'JSON data parsed correctly');
});

test('parse handles CraftTweaker JSON syntax with unquoted properties', (t) => {
    t.plan(2);

    const rawText = '<recipetype:minecraft:crafting>.addJsonRecipe("test", {type: "minecraft:crafting", pattern: ["ABC"]});';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.data.type, 'minecraft:crafting', 'unquoted property names handled');
    t.deepEqual(result.data.pattern, ['ABC'], 'complex JSON structures parsed correctly');
});

test('parse handles CraftTweaker JSON syntax with single quotes', (t) => {
    t.plan(1);

    const rawText = '<recipetype:test>.addJsonRecipe("recipe_id", {\'type\': \'test:recipe\'});';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.data.type, 'test:recipe', 'single quotes converted to double quotes');
});

test('parse handles complex nested JSON structures', (t) => {
    t.plan(1);

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

    t.deepEqual(result.data, expected, 'complex nested structures parsed correctly');
});

test('parse handles multiline JSON data', (t) => {
    t.plan(1);

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

    t.equal(result.data.type, 'create:pressing', 'multiline JSON parsed successfully');
});

test('parse throws error for invalid addJsonRecipe pattern', (t) => {
    t.plan(3);

    const invalidCases = [
        'not a recipe call at all',
        '<recipetype:test>.addJsonRecipe();',  // missing parameters
        'addJsonRecipe("test", {});'  // missing recipe type prefix
    ];

    invalidCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        t.throws(() => handler.parse(segment), /Unable to match addJsonRecipe pattern/,
                `throws error for invalid pattern ${index + 1}`);
    });
});

test('parse throws error for invalid JSON data', (t) => {
    t.plan(1);

    const rawText = '<recipetype:test>.addJsonRecipe("test", {invalid: json, syntax});';
    const segment = createTestSegment(rawText);

    t.throws(() => handler.parse(segment), /JSON/, 'throws JSON parsing error for malformed data');
});

test('parse preserves recipe type context from segment', (t) => {
    t.plan(2);

    const rawText = '<recipetype:create:sequenced_assembly>.addJsonRecipe("test", {type: "test"});';
    const segment1 = createTestSegment(rawText, '<recipetype:create:sequenced_assembly>');
    const segment2 = createTestSegment(rawText, null);

    const result1 = handler.parse(segment1);
    const result2 = handler.parse(segment2);

    t.equal(result1.recipeType, '<recipetype:create:sequenced_assembly>', 'preserves non-null recipe type');
    t.equal(result2.recipeType, null, 'preserves null recipe type');
});

test('parse handles empty JSON objects', (t) => {
    t.plan(1);

    const rawText = '<recipetype:test>.addJsonRecipe("empty_recipe", {});';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.deepEqual(result.data, {}, 'empty JSON object parsed correctly');
});

test('parse handles JSON arrays as root data', (t) => {
    t.plan(1);

    const rawText = '<recipetype:test>.addJsonRecipe("array_recipe", [{item: "test", count: 1}]);';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.deepEqual(result.data, [{ item: "test", count: 1 }], 'JSON array parsed correctly');
});

test('parse extracts recipe IDs with special characters', (t) => {
    t.plan(3);

    const testCases = [
        { id: 'simple_recipe', expected: 'simple_recipe' },
        { id: 'namespace:recipe_name', expected: 'namespace:recipe_name' },
        { id: 'recipe-with-hyphens_and_underscores', expected: 'recipe-with-hyphens_and_underscores' }
    ];

    testCases.forEach(({ id, expected }) => {
        const rawText = `<recipetype:test>.addJsonRecipe("${id}", {});`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);
        t.equal(result.recipeId, expected, `recipe ID "${id}" extracted correctly`);
    });
});

test('canParse and parse work together for dispatcher integration', (t) => {
    t.plan(2);

    const validSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {type: "test"});');
    const invalidSegment = createTestSegment('craftingTable.addShaped("test", <item:test>);');

    // Valid segment should be parsed successfully
    const canParseValid = handler.canParse(validSegment);
    t.equal(canParseValid, 1, 'valid segment gets positive canParse score');

    // Invalid segment should not be processed by this handler
    const canParseInvalid = handler.canParse(invalidSegment);
    t.equal(canParseInvalid, 0, 'invalid segment gets zero canParse score');
});