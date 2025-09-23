'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const RecipeLoader = require('./recipe-loader');

const app = express();
const PORT = 3000;
const recipeLoader = new RecipeLoader();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');

    // If index.html doesn't exist, send a simple response
    if (!require('fs').existsSync(indexPath)) {
        res.send(`
            <html>
                <head><title>Pattern Press</title></head>
                <body>
                    <h1>🎯 Pattern Press</h1>
                    <p>KubeJS Recipe Browser</p>
                    <h2>API Endpoints:</h2>
                    <ul>
                        <li><a href="/recipes">/recipes</a> - All recipes</li>
                        <li><a href="/recipes?mod=minecraft">/recipes?mod=minecraft</a> - Minecraft recipes</li>
                        <li><a href="/recipes?type=minecraft:crafting_shaped">/recipes?type=minecraft:crafting_shaped</a> - Shaped crafting recipes</li>
                        <li><a href="/recipes?search=boat">/recipes?search=boat</a> - Search for boats</li>
                        <li><a href="/stats">/stats</a> - Recipe statistics</li>
                    </ul>
                </body>
            </html>
        `);
        return;
    }

    res.sendFile(indexPath);
});

app.get('/recipes', (req, res) => {
    try {
        const { mod, type, search, page = 1, limit = 20 } = req.query;

        // Load recipes (from specific mod or all mods)
        let recipes;
        if (mod) {
            recipes = recipeLoader.loadMod(mod);
        } else {
            recipes = recipeLoader.loadAllRecipes();
        }

        // Apply filters
        const filters = { mod, type, search };
        const filteredRecipes = recipeLoader.filterRecipes(recipes, filters);

        // Paginate results
        const result = recipeLoader.paginate(filteredRecipes, page, limit);

        res.json(result);
    } catch (error) {
        console.error('Error loading recipes:', error);
        res.status(500).json({
            error: 'Failed to load recipes',
            message: error.message
        });
    }
});

app.get('/stats', (req, res) => {
    try {
        const stats = recipeLoader.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        res.status(500).json({
            error: 'Failed to load statistics',
            message: error.message
        });
    }
});

app.get('/metadata', (req, res) => {
    try {
        const metadata = recipeLoader.getMetadata();
        res.json(metadata);
    } catch (error) {
        console.error('Error loading metadata:', error);
        res.status(500).json({
            error: 'Failed to load metadata',
            message: error.message
        });
    }
});

// Future: Import from frontend-provided path
app.post('/import', (req, res) => {
    // TODO: Accept { path: "/path/to/kubejs/export/recipes" }
    // Validate path, run import process, return results
    res.json({
        success: false,
        message: 'Frontend import not implemented yet'
    });
});

app.listen(PORT, () => {
    console.log(`🎯 Pattern Press running on http://localhost:${PORT}`);
    console.log(`📁 Serving recipes from data/recipes/`);
});

module.exports = app;