class RecipeParser {
    constructor() {
        this.recipes = [];
        this.stats = {};
        this.currentPage = 1;
        this.recipesPerPage = 10;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        const typeFilter = document.getElementById('recipe-type-filter');
        const modFilter = document.getElementById('mod-filter');
        const searchFilter = document.getElementById('search-filter');

        if (typeFilter) typeFilter.addEventListener('change', () => this.filterRecipes());
        if (modFilter) modFilter.addEventListener('change', () => this.filterRecipes());
        if (searchFilter) searchFilter.addEventListener('input', () => this.filterRecipes());
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.uploadFile(files[0]);
            }
        });
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const uploadArea = document.getElementById('upload-area');
        const originalContent = uploadArea.innerHTML;

        uploadArea.innerHTML = '<div class="upload-content"><div class="loading">Processing...</div></div>';

        try {
            const formData = new FormData();
            formData.append('logFile', file);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.stats = result.stats;
                uploadArea.innerHTML = '<div class=\"upload-content\"><div class=\"loading\" style=\"color: #7bd45a;\">File processed successfully!</div></div>';
                this.showResults();
                await this.loadRecipes();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            uploadArea.innerHTML = originalContent;
            alert('Error uploading file: ' + error.message);
        }
    }

    showResults() {
        document.getElementById('filter-section').style.display = 'block';
        document.getElementById('recipes-section').style.display = 'block';

        this.populateFilters();
    }

    populateFilters() {
        const typeFilter = document.getElementById('recipe-type-filter');
        const modFilter = document.getElementById('mod-filter');

        // Clear existing options
        typeFilter.innerHTML = '<option value="">All Types</option>';
        modFilter.innerHTML = '<option value="">All Mods</option>';

        // Populate recipe types
        Object.keys(this.stats.byType).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = `${type} (${this.stats.byType[type]})`;
            typeFilter.appendChild(option);
        });

        // Populate mods
        Object.keys(this.stats.byMod).sort().forEach(mod => {
            const option = document.createElement('option');
            option.value = mod;
            option.textContent = `${mod} (${this.stats.byMod[mod]})`;
            modFilter.appendChild(option);
        });
    }

    async loadRecipes(page = 1) {
        const typeFilter = document.getElementById('recipe-type-filter').value;
        const modFilter = document.getElementById('mod-filter').value;
        const searchFilter = document.getElementById('search-filter').value;

        const params = new URLSearchParams({
            page: page,
            limit: this.recipesPerPage,
            ...(typeFilter && { type: typeFilter }),
            ...(modFilter && { mod: modFilter }),
            ...(searchFilter && { search: searchFilter })
        });

        try {
            const response = await fetch(`/recipes?${params}`);
            const data = await response.json();

            this.recipes = data.recipes;
            this.currentPage = data.page;
            this.totalPages = data.totalPages;

            this.renderRecipes();
            this.updateRecipeCount(data.total);
        } catch (error) {
            console.error('Error loading recipes:', error);
        }
    }

    filterRecipes() {
        this.currentPage = 1;
        this.loadRecipes(1);
    }

    renderRecipes() {
        const container = document.getElementById('recipes-container');
        container.innerHTML = '';

        this.recipes.forEach((recipe, index) => {
            const recipeCard = this.createRecipeCard(recipe, index);
            container.appendChild(recipeCard);
        });

        this.renderPagination();
    }

    createRecipeCard(recipe, index) {
        const card = document.createElement('div');
        card.className = 'recipe-card';

        const recipeType = this.getRecipeDisplayType(recipe.type);
        const recipeName = this.getRecipeDisplayName(recipe.name);
        const modLabel = this.getModLabel(recipe.mod);
        const formatLabel = this.getFormatLabel(recipe);
        const recipeTitle = this.escapeHtml(recipeName);
        const modBadge = this.escapeHtml(modLabel);
        const recipeTypeLabel = this.escapeHtml(recipeType);
        const formatBadge = formatLabel ? this.escapeHtml(formatLabel) : '';
        const fullRecipeId = this.escapeHtml(recipe.name);
        const recipeDescription = this.getRecipeDescription(recipe);

        card.innerHTML = `
            <div class="recipe-header">
                <div class="recipe-title-section">
                    <h3>${recipeTitle}</h3>
                    <div class="recipe-id-full">Recipe ID: <code>${fullRecipeId}</code></div>
                    ${recipeDescription ? `<div class="recipe-description">${this.escapeHtml(recipeDescription)}</div>` : ''}
                    <span class="recipe-mod-label">From: <span class="recipe-mod">${modBadge}</span></span>
                </div>
                <div class="recipe-meta">
                    <div class="recipe-type-section">
                        <span class="recipe-type-label">Recipe Type</span>
                        <span class="recipe-type">${recipeTypeLabel}</span>
                    </div>
                    ${formatBadge ? `
                        <div class="format-section">
                            <span class="format-label">Implementation</span>
                            <span class="format-badge">${formatBadge}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="recipe-content">
                ${this.renderRecipeVisual(recipe)}
            </div>
            <div class="recipe-details">
                <button class="details-btn" onclick="app.toggleDetails(${index})">
                    Show Details
                </button>
                <div class="recipe-raw-data" id="details-${index}" style="display: none;">
                    <pre>${this.escapeHtml(JSON.stringify(recipe.data, null, 2))}</pre>
                </div>
            </div>
        `;

        return card;
    }

    renderRecipeVisual(recipe) {
        const machineType = recipe.machineType;

        if (machineType === 'crafting_table' || recipe.type.includes('crafting')) {
            return this.renderCraftingGrid(recipe);
        }

        if (machineType === 'smelting' || machineType === 'blasting' || machineType === 'smoking') {
            return this.renderSmelting(recipe);
        }

        return this.renderGenericMachine(recipe);
    }

    renderCraftingGrid(recipe) {
        if (recipe.format === 'addShaped') {
            return this.renderShapedCrafting(recipe);
        }

        if (recipe.format === 'addShapeless') {
            return this.renderShapelessCrafting(recipe);
        }

        return this.renderGenericMachine(recipe);
    }

    renderShapedCrafting(recipe) {
        try {
            const pattern = recipe.data.pattern;
            const grid = this.parseCraftingPattern(pattern);
            return this.renderCraftingBoard(grid, recipe.data.output, 'shaped');
        } catch (error) {
            console.warn('Failed to render shaped crafting recipe:', error);
            return this.renderGenericMachine(recipe);
        }
    }

    renderShapelessCrafting(recipe) {
        try {
            const ingredients = this.parseCraftingIngredients(recipe.data.ingredients);
            const grid = this.buildShapelessGrid(ingredients);
            return this.renderCraftingBoard(grid, recipe.data.output, 'shapeless');
        } catch (error) {
            console.warn('Failed to render shapeless crafting recipe:', error);
            return this.renderGenericMachine(recipe);
        }
    }

    parseCraftingPattern(patternString = '') {
        try {
            const grid = Array.from({ length: 3 }, () => Array(3).fill(null));
            if (!patternString) {
                return grid;
            }

            const matches = patternString.match(/\[[^\[\]]*\]/g);
            if (!matches) {
                return grid;
            }

            matches.slice(0, 3).forEach((row, rowIndex) => {
                const cells = row.slice(1, -1).split(',').map((cell) => this.normalizeCraftingEntry(cell));
                cells.slice(0, 3).forEach((cell, colIndex) => {
                    grid[rowIndex][colIndex] = cell;
                });
            });

            return grid;
        } catch (error) {
            console.warn('Failed to parse crafting pattern:', error);
            return Array.from({ length: 3 }, () => Array(3).fill(null));
        }
    }

    parseCraftingIngredients(ingredientsString = '') {
        try {
            const trimmed = ingredientsString.trim();
            if (!trimmed || trimmed === '[]') {
                return [];
            }

            const body = trimmed.replace(/^\[|\]$/g, '');
            const items = [];
            let buffer = '';
            let depth = 0;

            for (const char of body) {
                if (char === '[') depth += 1;
                if (char === ']') depth = Math.max(0, depth - 1);

                if (char === ',' && depth === 0) {
                    items.push(this.normalizeCraftingEntry(buffer));
                    buffer = '';
                    continue;
                }

                buffer += char;
            }

            if (buffer.trim()) {
                items.push(this.normalizeCraftingEntry(buffer));
            }

            return items.filter(Boolean);
        } catch (error) {
            console.warn('Failed to parse crafting ingredients:', error);
            return [];
        }
    }

    buildShapelessGrid(ingredients) {
        const grid = Array.from({ length: 3 }, () => Array(3).fill(null));
        ingredients.forEach((ingredient, index) => {
            if (!ingredient) return;
            const row = Math.floor(index / 3);
            const col = index % 3;
            if (row < 3 && col < 3) {
                grid[row][col] = ingredient;
            }
        });
        return grid;
    }

    renderCraftingBoard(grid, outputString, layout = 'shaped') {
        const boardLabel = layout === 'shapeless' ? '<span class="board-label">Shapeless</span>' : '';
        return `
            <div class="crafting-board">
                ${boardLabel}
                <div class="crafting-grid">
                    ${grid.map(row => row.map(item => this.renderCraftingSlot(item)).join('')).join('')}
                </div>
                <div class="arrow-icon">&rarr;</div>
                ${this.renderCraftingOutput(outputString)}
            </div>
        `;
    }

    renderCraftingSlot(item) {
        if (!item) {
            return '<div class="crafting-slot empty"><span class="slot-placeholder">Empty</span></div>';
        }

        const name = this.getCraftingItemName(item);
        const safeName = this.escapeHtml(name);
        const badge = this.getCraftingItemIcon(item);

        return `
            <div class="crafting-slot" title="${safeName}">
                <div class="slot-chip">
                    <span class="slot-badge">${badge}</span>
                    <span class="slot-label">${safeName}</span>
                </div>
            </div>
        `;
    }

    renderCraftingOutput(outputString) {
        const name = this.getCraftingItemName(outputString);
        const amount = this.getOutputAmount(outputString);
        const label = amount > 1 ? `${name} x${amount}` : name;
        const safeLabel = this.escapeHtml(label);
        const badge = this.getCraftingItemIcon(outputString);

        return `
            <div class="output-slot" title="${safeLabel}">
                <div class="slot-chip">
                    <span class="slot-badge highlight">${badge}</span>
                    <div class="slot-meta">
                        <span class="slot-label">${safeLabel}</span>
                        ${amount > 1 ? `<span class="slot-subtext">Stack of ${amount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    normalizeCraftingEntry(rawValue) {
        if (!rawValue) {
            return null;
        }

        const trimmed = rawValue.trim();
        if (!trimmed || trimmed === 'null') {
            return null;
        }

        if (trimmed.includes('IIngredientEmpty')) {
            return null;
        }

        return trimmed;
    }

    getCraftingItemIcon(itemString) {
        const name = this.getCraftingItemName(itemString);
        return this.getBadgeLetters(name);
    }

    getCraftingItemName(itemString) {
        if (!itemString) return '';

        const primary = itemString.split('|')[0].trim();
        const amountSplit = primary.split('*');
        const base = amountSplit[0].trim();

        const match = base.match(/<(?:item|tag):([^>]+)>/);
        if (match) {
            const pretty = this.prettifyIdentifier(match[1].replace(/^[^:]+:/, ''));
            return this.capitalizeWords(pretty);
        }

        const cleaned = this.prettifyIdentifier(base.replace(/^[^:]+:/, '').replace(/[<>]/g, ''));
        return this.capitalizeWords(cleaned);
    }

    getOutputAmount(outputString = '') {
        const amountMatch = outputString.match(/\*\s*(\d+)/);
        return amountMatch ? parseInt(amountMatch[1], 10) : 0;
    }

    getFormatLabel(recipe) {
        switch (recipe.format) {
            case 'addShaped':
                return 'Shaped';
            case 'addShapeless':
                return 'Shapeless';
            case 'addJsonRecipe':
                return 'JSON';
            default:
                return '';
        }
    }

    getRecipeDisplayName(name) {
        if (!name) {
            return 'Unnamed Recipe';
        }
        const cleaned = this.prettifyIdentifier(name.replace(/^[^:]+:/, ''));
        return this.capitalizeWords(cleaned);
    }

    getModLabel(mod) {
        const fallback = mod || 'minecraft';
        const cleaned = this.prettifyIdentifier(fallback);
        return this.capitalizeWords(cleaned);
    }    renderSmelting(recipe) {
        return `
            <div class="machine-board">
                <div class="machine-column">
                    <h4>Input</h4>
                    ${this.renderItems(recipe.inputs.items)}
                </div>
                <div class="arrow-icon">&rarr;</div>
                <div class="machine-column">
                    <h4>Output</h4>
                    ${this.renderItems(recipe.outputs.items)}
                </div>
            </div>
        `;
    }


    renderGenericMachine(recipe) {
        const hasInputs = recipe.inputs.items.length > 0 || recipe.inputs.fluids.length > 0;
        const hasOutputs = recipe.outputs.items.length > 0 || recipe.outputs.fluids.length > 0;

        // Special handling for dynamic JSON recipes with no traditional inputs/outputs
        if (!hasInputs && !hasOutputs && recipe.format === 'addJsonRecipe') {
            return this.renderDynamicRecipe(recipe);
        }

        const inputsMarkup = `
            <div class="machine-column">
                <h4>Inputs</h4>
                ${this.renderItems(recipe.inputs.items)}
                ${this.renderFluids(recipe.inputs.fluids)}
            </div>
        `;

        const outputsMarkup = `
            <div class="machine-column">
                <h4>Outputs</h4>
                ${this.renderItems(recipe.outputs.items)}
                ${this.renderFluids(recipe.outputs.fluids)}
            </div>
        `;

        return `
            <div class="machine-board">
                ${hasInputs ? inputsMarkup : ''}
                ${hasInputs && hasOutputs ? '<div class="arrow-icon">&rarr;</div>' : ''}
                ${hasOutputs ? outputsMarkup : ''}
                ${this.renderRecipeProperties(recipe)}
            </div>
        `;
    }

    renderDynamicRecipe(recipe) {
        const recipeData = recipe.data || {};
        const hasSpecialTools = recipeData.copy_tool || recipeData.tool;

        return `
            <div class="dynamic-recipe-board">
                <div class="dynamic-recipe-info">
                    <div class="dynamic-recipe-type">
                        <strong>Dynamic Recipe Type:</strong>
                        <code>${this.escapeHtml(recipeData.type || 'Unknown')}</code>
                    </div>
                    ${recipeData.category ? `
                        <div class="dynamic-recipe-category">
                            <strong>Category:</strong> ${this.escapeHtml(recipeData.category)}
                        </div>
                    ` : ''}
                    ${hasSpecialTools ? `
                        <div class="dynamic-recipe-tools">
                            <strong>Special Tools:</strong>
                            ${this.renderSpecialTools(recipeData)}
                        </div>
                    ` : ''}
                </div>
                <div class="dynamic-recipe-explanation">
                    <p><em>This is a dynamic recipe that works programmatically. The actual ingredients and outputs are determined by the mod's game logic when you use it in-game.</em></p>
                </div>
            </div>
        `;
    }

    renderSpecialTools(recipeData) {
        const tools = [];

        if (recipeData.copy_tool && recipeData.copy_tool.item) {
            const toolName = this.getCraftingItemName(recipeData.copy_tool.item);
            tools.push(`<span class="tool-item">${this.escapeHtml(toolName)}</span>`);
        }

        if (recipeData.tool) {
            const toolName = this.getCraftingItemName(recipeData.tool);
            tools.push(`<span class="tool-item">${this.escapeHtml(toolName)}</span>`);
        }

        return tools.join(', ');
    }

    renderItems(items) {
        if (!items || items.length === 0) return '';

        return `
            <div class="items-list">
                ${items.map(item => `
                    <div class="item-slot">
                        <div class="item-icon">${this.getItemIcon(item)}</div>
                        <div class="item-info">
                            <div class="item-name">${this.getItemName(item)}</div>
                            ${item.amount ? `<div class="item-amount">Ã—${item.amount}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderFluids(fluids) {
        if (!fluids || fluids.length === 0) return '';

        return `
            <div class="fluids-list">
                ${fluids.map(fluid => `
                    <div class="fluid-slot">
                        <div class="fluid-icon">ðŸ§ª</div>
                        <div class="fluid-info">
                            <div class="fluid-name">${this.getFluidName(fluid)}</div>
                            ${fluid.amount ? `<div class="fluid-amount">${fluid.amount}mb</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRecipeProperties(recipe) {
        const properties = [];

        if (recipe.data.eu) properties.push(`Energy: ${recipe.data.eu} EU`);
        if (recipe.data.duration) properties.push(`Duration: ${recipe.data.duration} ticks`);
        if (recipe.data.temperature) {
            const temp = recipe.data.temperature;
            if (temp.min && temp.max) {
                properties.push(`Temperature: ${temp.min}-${temp.max}K`);
            }
        }
        if (recipe.data.pressure) properties.push(`Pressure: ${recipe.data.pressure} bar`);
        if (recipe.data.speed) properties.push(`Speed: ${recipe.data.speed}x`);

        if (properties.length === 0) return '';

        const markup = properties.map((prop) => `<span class="property">${this.escapeHtml(prop)}</span>`).join('');
        return `
            <div class="recipe-properties">
                ${markup}
            </div>
        `;
    }

    getItemIcon(item) {
        const baseName = this.getItemName(item);
        return this.getBadgeLetters(baseName);
    }

    getItemName(item) {
        if (!item) {
            return 'Unknown Item';
        }
        if (item.item) {
            const cleaned = this.prettifyIdentifier(item.item.replace(/^[^:]+:/, ''));
            return this.capitalizeWords(cleaned);
        }
        if (item.tag) {
            const cleaned = this.prettifyIdentifier(item.tag.replace(/^[^:]+:/, ''));
            return `#${this.capitalizeWords(cleaned)}`;
        }
        return 'Unknown Item';
    }

    getBadgeLetters(label = '') {
        if (!label) {
            return '–';
        }

        const words = label.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            return '–';
        }

        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        const first = words[0].charAt(0);
        const second = words[1].charAt(0);
        return `${first}${second}`.toUpperCase();
    }

    getFluidName(fluid) {
        if (!fluid) {
            return 'Unknown Fluid';
        }
        if (fluid.fluid) {
            const cleaned = this.prettifyIdentifier(fluid.fluid.replace(/^[^:]+:/, ''));
            return this.capitalizeWords(cleaned);
        }
        if (fluid.id) {
            const cleaned = this.prettifyIdentifier(fluid.id.replace(/^[^:]+:/, ''));
            return this.capitalizeWords(cleaned);
        }
        return 'Unknown Fluid';
    }

    getRecipeDisplayType(type) {
        const parts = type.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
        return type;
    }

    getRecipeDescription(recipe) {
        // Provide helpful descriptions for dynamic/special recipe types
        if (recipe.format === 'addJsonRecipe') {
            const type = recipe.data?.type || '';

            // Special recipe type descriptions
            const descriptions = {
                'ae2:add_item_upgrade': 'Dynamic recipe for upgrading Applied Energistics 2 items with upgrade components in crafting grid',
                'ae2:remove_item_upgrade': 'Dynamic recipe for removing upgrades from Applied Energistics 2 items',
                'framedblocks:apply_camo': 'Special recipe for applying camouflage patterns to FramedBlocks using a brush tool',
                'sophisticatedbackpacks:backpack_dye': 'Dynamic recipe for dyeing SophisticatedBackpacks with any dye color',
                'sophisticatedbackpacks:backpack_upgrade': 'Recipe for adding upgrade components to SophisticatedBackpacks',
                'sophisticatedstorage:storage_dye': 'Dynamic recipe for dyeing SophisticatedStorage blocks with any dye color',
                'create:item_application': 'Create mod recipe for applying items to blocks or other items',
                'thermal:dynamo_fuel': 'Thermal Series recipe defining fuel types and burn values for dynamos',
                'immersiveengineering:blueprint': 'Immersive Engineering blueprint crafting recipe',
                'botania:petal_apothecary': 'Botania recipe for the Petal Apothecary ritual crafting',
                'mekanism:combiner': 'Mekanism Combiner recipe for merging items with other materials'
            };

            if (descriptions[type]) {
                return descriptions[type];
            }

            // Generic descriptions for mod namespaces
            const modDescriptions = {
                'ae2': 'Applied Energistics 2 dynamic recipe that works with compatible items',
                'create': 'Create mod special recipe with programmatic behavior',
                'thermal': 'Thermal Series recipe with dynamic item/energy interactions',
                'mekanism': 'Mekanism machine recipe with special processing logic',
                'immersiveengineering': 'Immersive Engineering special crafting recipe',
                'botania': 'Botania magical recipe with ritual or special requirements',
                'sophisticatedbackpacks': 'SophisticatedBackpacks dynamic recipe for item modifications',
                'sophisticatedstorage': 'SophisticatedStorage dynamic recipe for storage modifications'
            };

            const modNamespace = type.split(':')[0];
            if (modDescriptions[modNamespace]) {
                return modDescriptions[modNamespace];
            }

            // Check if it's a simple recipe with just type and category
            const hasOnlyTypeAndCategory = recipe.data &&
                Object.keys(recipe.data).length <= 2 &&
                recipe.data.type &&
                (recipe.data.category || Object.keys(recipe.data).length === 1);

            if (hasOnlyTypeAndCategory) {
                return 'Dynamic recipe that works programmatically - ingredients and outputs determined by game logic';
            }
        }

        return null;
    }

    updateRecipeCount(total) {
        document.getElementById('recipe-count').textContent = `(${total} recipes)`;
    }

    escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).replace(/[&<>"']/g, (char) => {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return map[char] || char;
        });
    }

    prettifyIdentifier(value) {
        if (!value) {
            return '';
        }
        return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    capitalizeWords(value) {
        if (!value) {
            return '';
        }
        return value.replace(/\b(\w)/g, (match) => match.toUpperCase());
    }    renderPagination() {
        // Simple pagination - could be enhanced
        const container = document.getElementById('recipes-container');

        if (this.totalPages > 1) {
            const pagination = document.createElement('div');
            pagination.className = 'pagination';

            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.disabled = this.currentPage === 1;
            prevButton.onclick = () => this.loadRecipes(this.currentPage - 1);

            const pageInfo = document.createElement('span');
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.disabled = this.currentPage === this.totalPages;
            nextButton.onclick = () => this.loadRecipes(this.currentPage + 1);

            pagination.appendChild(prevButton);
            pagination.appendChild(pageInfo);
            pagination.appendChild(nextButton);

            container.appendChild(pagination);
        }
    }

    toggleDetails(index) {
        const details = document.getElementById(`details-${index}`);
        const button = details.previousElementSibling;

        if (details.style.display === 'none') {
            details.style.display = 'block';
            button.textContent = 'Hide Details';
        } else {
            details.style.display = 'none';
            button.textContent = 'Show Details';
        }
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new RecipeParser();
});
























