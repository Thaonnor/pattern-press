const test = require('tape');
const handler = require('../src/parsers/handlers/shapedCraftingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:crafting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 3
    };
}

test('shapedCraftingHandler has required interface', (t) => {
    t.plan(3);

    t.equal(handler.name, 'shaped-crafting-handler', 'handler has correct name');
    t.equal(typeof handler.canParse, 'function', 'canParse method exists');
    t.equal(typeof handler.parse, 'function', 'parse method exists');
});

test('canParse returns 1 for segments with addShaped calls', (t) => {
    t.plan(1);

    const segment = createTestSegment('craftingTable.addShaped("test", <item:minecraft:stick>, []);');
    const score = handler.canParse(segment);

    t.equal(score, 1, 'returns positive score for addShaped segments');
});

test('canParse returns 0 for segments without addShaped calls', (t) => {
    t.plan(3);

    const testCases = [
        'craftingTable.addShapeless("test", <item:minecraft:stick>, []);',
        '<recipetype:create:mixing>.addJsonRecipe("test", {});',
        'some other log content'
    ];

    testCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        const score = handler.canParse(segment);
        t.equal(score, 0, `returns zero score for non-addShaped segment ${index + 1}`);
    });
});

test('canParse handles invalid segment input', (t) => {
    t.plan(3);

    t.equal(handler.canParse(null), 0, 'handles null segment');
    t.equal(handler.canParse({}), 0, 'handles segment without rawText');
    t.equal(handler.canParse({ rawText: null }), 0, 'handles segment with null rawText');
});

test('parse extracts basic recipe components', (t) => {
    t.plan(6);

    const rawText = 'craftingTable.addShaped("test_recipe", <item:minecraft:stick>, ["A", "A", "A"]);';
    const segment = createTestSegment(rawText, '<recipetype:minecraft:crafting>');

    const result = handler.parse(segment);

    t.equal(result.recipeId, 'test_recipe', 'recipe ID extracted correctly');
    t.equal(result.recipeType, '<recipetype:minecraft:crafting>', 'recipe type preserved from segment');
    t.equal(result.format, 'addShaped', 'format identifier set correctly');
    t.equal(result.output, '<item:minecraft:stick>', 'raw output preserved');
    t.equal(result.outputParsed.raw, '<item:minecraft:stick>', 'output item parsed');
    t.equal(result.outputParsed.count, 1, 'default count is 1');
});

test('parse handles output specifications with multipliers', (t) => {
    t.plan(4);

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

        t.deepEqual(result.outputParsed, { raw: expectedRaw, count: expectedCount },
                   `output spec "${spec}" parsed correctly`);
    });
});

test('parse handles malformed multipliers gracefully', (t) => {
    t.plan(3);

    const testCases = [
        '<item:minecraft:stick> * invalid',
        '<item:minecraft:stick> * NaN',
        '<item:minecraft:stick> *'
    ];

    testCases.forEach((spec) => {
        const rawText = `craftingTable.addShaped("test", ${spec}, ["A"]);`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);

        t.equal(result.outputParsed.count, 1, `malformed multiplier in "${spec}" defaults to 1`);
    });
});

test('parse extracts crafting patterns correctly', (t) => {
    t.plan(3);

    const patterns = [
        '["AAA", "ABA", "AAA"]',
        '[" A ", " B ", " A "]',
        '["AB", "BA"]'
    ];

    patterns.forEach((pattern) => {
        const rawText = `craftingTable.addShaped("test", <item:test>, ${pattern});`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);

        t.equal(result.pattern, pattern, `pattern "${pattern}" extracted correctly`);
    });
});

test('parse handles multiline patterns', (t) => {
    t.plan(1);

    const rawText = `craftingTable.addShaped("multiline_recipe", <item:minecraft:crafting_table>, [
        "AAA",
        "A A",
        "AAA"
    ]);`;
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.ok(result.pattern.includes('"AAA"'), 'multiline pattern content preserved');
});

test('parse handles complex recipe patterns with mappings', (t) => {
    t.plan(1);

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

    t.ok(result.pattern.includes('<item:minecraft:diamond>'), 'complex pattern with mappings preserved');
});

test('parse throws error for invalid addShaped pattern', (t) => {
    t.plan(4);

    const invalidCases = [
        'not a recipe call at all',
        'craftingTable.addShaped();',  // missing parameters
        'craftingTable.addShaped("test");',  // missing output and pattern
        'addShaped("test", <item:test>, []);'  // missing craftingTable prefix
    ];

    invalidCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        t.throws(() => handler.parse(segment), /Unable to match addShaped pattern/,
                `throws error for invalid pattern ${index + 1}`);
    });
});

test('parse preserves recipe type context from segment', (t) => {
    t.plan(2);

    const rawText = 'craftingTable.addShaped("test", <item:minecraft:stick>, ["A"]);';
    const segment1 = createTestSegment(rawText, '<recipetype:minecraft:crafting>');
    const segment2 = createTestSegment(rawText, null);

    const result1 = handler.parse(segment1);
    const result2 = handler.parse(segment2);

    t.equal(result1.recipeType, '<recipetype:minecraft:crafting>', 'preserves non-null recipe type');
    t.equal(result2.recipeType, null, 'preserves null recipe type');
});

test('parse handles recipe IDs with special characters', (t) => {
    t.plan(3);

    const testCases = [
        { id: 'simple_recipe', expected: 'simple_recipe' },
        { id: 'namespace:recipe_name', expected: 'namespace:recipe_name' },
        { id: 'recipe-with-hyphens_and_underscores', expected: 'recipe-with-hyphens_and_underscores' }
    ];

    testCases.forEach(({ id, expected }) => {
        const rawText = `craftingTable.addShaped("${id}", <item:test>, []);`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);
        t.equal(result.recipeId, expected, `recipe ID "${id}" extracted correctly`);
    });
});

test('parse handles minimal valid output specifications', (t) => {
    t.plan(1);

    // Test with a minimal valid output specification
    const validRawText = 'craftingTable.addShaped("test", <item:air>, ["A"]);';
    const validSegment = createTestSegment(validRawText);
    const result = handler.parse(validSegment);

    t.ok(result.outputParsed.raw !== null, 'handles minimal valid output spec');
});

test('parse handles whitespace in output specifications', (t) => {
    t.plan(2);

    const rawText = 'craftingTable.addShaped("test",   <item:minecraft:stick>   *   4   , ["A"]);';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.outputParsed.raw, '<item:minecraft:stick>', 'whitespace trimmed from output item');
    t.equal(result.outputParsed.count, 4, 'multiplier parsed despite extra whitespace');
});

test('parse handles various item specification formats', (t) => {
    t.plan(4);

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

        t.equal(result.outputParsed.raw, itemSpec, `item format "${itemSpec}" preserved correctly`);
    });
});

test('canParse and parse work together for dispatcher integration', (t) => {
    t.plan(2);

    const validSegment = createTestSegment('craftingTable.addShaped("test", <item:minecraft:stick>, ["A"]);');
    const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

    // Valid segment should be parsed successfully
    const canParseValid = handler.canParse(validSegment);
    t.equal(canParseValid, 1, 'valid segment gets positive canParse score');

    // Invalid segment should not be processed by this handler
    const canParseInvalid = handler.canParse(invalidSegment);
    t.equal(canParseInvalid, 0, 'invalid segment gets zero canParse score');
});

test('parse handles zero multipliers', (t) => {
    t.plan(1);

    const rawText = 'craftingTable.addShaped("test", <item:minecraft:stick> * 0, ["A"]);';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.outputParsed.count, 0, 'zero multiplier preserved');
});