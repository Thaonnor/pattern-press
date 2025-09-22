const test = require('tape');
const proxyquire = require('proxyquire');
const supertest = require('supertest');

function createServerUnderTest(processedSegmentsOverride) {
    const segmentCalls = [];
    const dispatcherArgs = [];
    const segments = [{ id: 1 }, { id: 2 }];

    const processedSegments =
        processedSegmentsOverride || [
            {
                dispatch: {
                    status: 'parsed',
                    handler: 'json-crafting-handler',
                    result: {
                        recipeType: '<recipetype:create:pressing>',
                        recipeId: 'create:press_brass',
                        data: {
                            item_inputs: [{ item: '<item:create:plate>', amount: 2 }],
                            item_outputs: [{ item: '<item:create:pressed_plate>', amount: 1 }]
                        }
                    }
                }
            },
            {
                recipeType: '<recipetype:minecraft:crafting>',
                dispatch: {
                    status: 'parsed',
                    handler: 'shaped-crafting-handler',
                    result: {
                        pattern: '<item:minecraft:stick> <item:minecraft:stick>',
                        output: '<item:minecraft:ladder>'
                    }
                }
            },
            {
                dispatch: {
                    status: 'parsed',
                    handler: 'shapeless-crafting-handler',
                    result: {
                        recipeType: '<recipetype:create:mixing>',
                        recipeId: 'create:dough',
                        ingredients: '<item:create:andesite_alloy> <item:minecraft:water_bucket>',
                        output: '<item:create:dough>'
                    }
                }
            },
            {
                startLine: 1,
                endLine: 2,
                dispatch: { status: 'error', error: 'boom' }
            },
            {
                startLine: 3,
                endLine: 4,
                dispatch: { status: 'unknown' }
            }
        ];

    const serverModule = proxyquire('../src/server', {
        './log-segmenter': {
            segmentLogContent: (content) => {
                segmentCalls.push(content);
                return segments;
            }
        },
        './parsers': {
            createDefaultDispatcher: (options) => {
                dispatcherArgs.push(options);
                return { logger: options.logger };
            },
            processSegments: async () => processedSegments
        }
    });

    return {
        serverModule,
        segmentCalls,
        dispatcherArgs,
        segments,
        processedSegments
    };
}

test('parseRecipeLog normalizes dispatcher output', async (t) => {
    const { serverModule, segmentCalls, dispatcherArgs, segments } = createServerUnderTest();

    const recipes = await serverModule.parseRecipeLog('log contents');

    t.equal(segmentCalls.length, 1, 'segmentLogContent called once');
    t.equal(segmentCalls[0], 'log contents', 'segmentLogContent receives log body');
    t.equal(dispatcherArgs.length, 1, 'dispatcher created once');
    t.equal(recipes.length, 3, 'returns only parsed segments');

    const [jsonRecipe, shapedRecipe, shapelessRecipe] = recipes;
    t.equal(jsonRecipe.format, 'addJsonRecipe', 'json handler normalized');
    t.equal(shapedRecipe.format, 'addShaped', 'shaped handler normalized');
    t.equal(shapelessRecipe.format, 'addShapeless', 'shapeless handler normalized');
    t.equal(shapelessRecipe.machineType, 'mixing', 'machine type derived from recipe type');
    t.deepEqual(shapedRecipe.outputs.items[0].item, '<item:minecraft:ladder>', 'shaped outputs extracted');
});

test('POST /upload validates file presence', async (t) => {
    const { serverModule } = createServerUnderTest();
    const request = supertest(serverModule.app);

    const response = await request.post('/upload');
    t.equal(response.status, 400, 'missing file returns 400');
    t.equal(response.body.error, 'No file uploaded', 'error message returned');
});

test('upload -> recipes -> stats flow uses parsed cache', async (t) => {
    const { serverModule } = createServerUnderTest();
    const request = supertest(serverModule.app);

    const initialRecipes = await request.get('/recipes');
    t.equal(initialRecipes.body.total, 0, 'no recipes before upload');

    const uploadResponse = await request
        .post('/upload')
        .attach('logFile', Buffer.from('fake log contents'), 'crafttweaker.log');

    t.equal(uploadResponse.status, 200, 'successful upload returns 200');
    t.equal(uploadResponse.body.success, true, 'upload success flagged');
    t.equal(uploadResponse.body.stats.total, 3, 'stats returned for parsed recipes');

    const recipesResponse = await request.get('/recipes').query({ limit: 2, page: 1 });
    t.equal(recipesResponse.body.recipes.length, 2, 'pagination respected');
    t.equal(recipesResponse.body.total, 3, 'total reflects cached recipes');
    t.equal(recipesResponse.body.totalPages, 2, 'total pages calculated');

    const filteredByMod = await request.get('/recipes').query({ mod: 'create' });
    const secondPage = await request.get('/recipes').query({ page: 2, limit: 2 });
    t.ok(filteredByMod.body.recipes.every((recipe) => recipe.mod === 'create'), 'mod filter applied');

    const searchByName = await request.get('/recipes').query({ search: 'ladder' });
    t.equal(searchByName.body.recipes.length, 1, 'search filter applied to recipe data');

    const statsResponse = await request.get('/stats');
    t.equal(statsResponse.body.total, 3, 'stats endpoint reflects cached data');
    t.equal(statsResponse.body.byMod.create, 2, 'mod aggregation returned');
});
