const test = require('tape');
const handler = require('../src/parsers/handlers/shapelessCraftingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:crafting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 3
    };
}

test('shapelessCraftingHandler has required interface', (t) => {
    t.plan(3);

    t.equal(handler.name, 'shapeless-crafting-handler', 'handler has correct name');
    t.equal(typeof handler.canParse, 'function', 'canParse method exists');
    t.equal(typeof handler.parse, 'function', 'parse method exists');
});

test('canParse returns 1 for segments with addShapeless calls', (t) => {
    t.plan(1);

    const segment = createTestSegment('craftingTable.addShapeless("test", <item:minecraft:stick>, []);');
    const score = handler.canParse(segment);

    t.equal(score, 1, 'returns positive score for addShapeless segments');
});

test('canParse returns 0 for segments without addShapeless calls', (t) => {
    t.plan(3);

    const testCases = [
        'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
        '<recipetype:create:mixing>.addJsonRecipe("test", {});',
        'some other log content'
    ];

    testCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        const score = handler.canParse(segment);
        t.equal(score, 0, `returns zero score for non-addShapeless segment ${index + 1}`);
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

    const rawText = 'craftingTable.addShapeless("test_recipe", <item:minecraft:stick>, [<item:minecraft:planks>]);';
    const segment = createTestSegment(rawText, '<recipetype:minecraft:crafting>');

    const result = handler.parse(segment);

    t.equal(result.recipeId, 'test_recipe', 'recipe ID extracted correctly');
    t.equal(result.recipeType, '<recipetype:minecraft:crafting>', 'recipe type preserved from segment');
    t.equal(result.format, 'addShapeless', 'format identifier set correctly');
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
        const rawText = `craftingTable.addShapeless("test", ${spec}, [<item:test>]);`;
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
        const rawText = `craftingTable.addShapeless("test", ${spec}, [<item:test>]);`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);

        t.equal(result.outputParsed.count, 1, `malformed multiplier in "${spec}" defaults to 1`);
    });
});

test('parse extracts ingredients correctly', (t) => {
    t.plan(3);

    const ingredientLists = [
        '[<item:minecraft:planks>]',
        '[<item:minecraft:iron_ingot>, <item:minecraft:stick>]',
        '[<tag:forge:ingots>, <item:minecraft:diamond>, <fluid:minecraft:water>]'
    ];

    ingredientLists.forEach((ingredients) => {
        const rawText = `craftingTable.addShapeless("test", <item:test>, ${ingredients});`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);

        t.equal(result.ingredients, ingredients, `ingredients "${ingredients}" extracted correctly`);
    });
});

test('parse handles multiline ingredients', (t) => {
    t.plan(1);

    const rawText = `craftingTable.addShapeless("multiline_recipe", <item:minecraft:crafting_table>, [
        <item:minecraft:planks>,
        <item:minecraft:planks>,
        <item:minecraft:planks>,
        <item:minecraft:planks>
    ]);`;
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.ok(result.ingredients.includes('<item:minecraft:planks>'), 'multiline ingredients content preserved');
});

test('parse handles complex ingredient specifications', (t) => {
    t.plan(1);

    const complexIngredients = `[
        <tag:forge:dusts/redstone>,
        <item:minecraft:glowstone_dust>,
        <item:minecraft:ender_pearl>.withTag({display: {Name: "Special Pearl"}}),
        <fluid:minecraft:water> * 1000
    ]`;
    const rawText = `craftingTable.addShapeless("complex_recipe", <item:minecraft:ender_eye>, ${complexIngredients});`;
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.ok(result.ingredients.includes('<tag:forge:dusts/redstone>'), 'complex ingredients with tags and NBT preserved');
});

test('parse throws error for invalid addShapeless pattern', (t) => {
    t.plan(4);

    const invalidCases = [
        'not a recipe call at all',
        'craftingTable.addShapeless();',  // missing parameters
        'craftingTable.addShapeless("test");',  // missing output and ingredients
        'addShapeless("test", <item:test>, []);'  // missing craftingTable prefix
    ];

    invalidCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        t.throws(() => handler.parse(segment), /Unable to match addShapeless pattern/,
                `throws error for invalid pattern ${index + 1}`);
    });
});

test('parse preserves recipe type context from segment', (t) => {
    t.plan(2);

    const rawText = 'craftingTable.addShapeless("test", <item:minecraft:stick>, [<item:test>]);';
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
        const rawText = `craftingTable.addShapeless("${id}", <item:test>, []);`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);
        t.equal(result.recipeId, expected, `recipe ID "${id}" extracted correctly`);
    });
});

test('parse handles whitespace in output specifications', (t) => {
    t.plan(2);

    const rawText = 'craftingTable.addShapeless("test",   <item:minecraft:stick>   *   4   , [<item:test>]);';
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
        const rawText = `craftingTable.addShapeless("test", ${itemSpec}, [<item:test>]);`;
        const segment = createTestSegment(rawText);
        const result = handler.parse(segment);

        t.equal(result.outputParsed.raw, itemSpec, `item format "${itemSpec}" preserved correctly`);
    });
});

test('parse handles empty ingredients array', (t) => {
    t.plan(1);

    const rawText = 'craftingTable.addShapeless("empty_ingredients", <item:minecraft:barrier>, []);';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.ingredients, '[]', 'empty ingredients array preserved');
});

test('parse handles single ingredient', (t) => {
    t.plan(1);

    const rawText = 'craftingTable.addShapeless("single_ingredient", <item:minecraft:stick>, [<item:minecraft:planks>]);';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.ingredients, '[<item:minecraft:planks>]', 'single ingredient preserved correctly');
});

test('parse handles ingredients with NBT data', (t) => {
    t.plan(1);

    const ingredientsWithNBT = '[<item:minecraft:potion>.withTag({Potion: "minecraft:healing"}), <item:minecraft:sugar>]';
    const rawText = `craftingTable.addShapeless("potion_recipe", <item:minecraft:splash_potion>, ${ingredientsWithNBT});`;
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.ok(result.ingredients.includes('withTag'), 'NBT data in ingredients preserved');
});

test('parse handles ingredients with damage values', (t) => {
    t.plan(1);

    const ingredientsWithDamage = '[<item:minecraft:iron_sword>.withDamage(10), <item:minecraft:iron_ingot>]';
    const rawText = `craftingTable.addShapeless("repair_recipe", <item:minecraft:iron_sword>, ${ingredientsWithDamage});`;
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.ok(result.ingredients.includes('withDamage'), 'damage values in ingredients preserved');
});

test('canParse and parse work together for dispatcher integration', (t) => {
    t.plan(2);

    const validSegment = createTestSegment('craftingTable.addShapeless("test", <item:minecraft:stick>, [<item:test>]);');
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

    const rawText = 'craftingTable.addShapeless("test", <item:minecraft:stick> * 0, [<item:test>]);';
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.equal(result.outputParsed.count, 0, 'zero multiplier preserved');
});

test('parse handles very large ingredient lists', (t) => {
    t.plan(1);

    // Create a large ingredients list to test parsing performance and correctness
    const manyIngredients = Array.from({ length: 20 }, (_, i) => `<item:minecraft:item${i}>`).join(', ');
    const ingredientsList = `[${manyIngredients}]`;
    const rawText = `craftingTable.addShapeless("big_recipe", <item:minecraft:diamond>, ${ingredientsList});`;
    const segment = createTestSegment(rawText);

    const result = handler.parse(segment);

    t.ok(result.ingredients.includes('item0') && result.ingredients.includes('item19'), 'large ingredient lists handled correctly');
});