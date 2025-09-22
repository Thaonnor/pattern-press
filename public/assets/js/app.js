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
                uploadArea.innerHTML = '<div class="upload-content"><div style="color: #55ff55;">✓ File processed successfully!</div></div>';
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

        card.innerHTML = `
            <div class="recipe-header">
                <h3>${recipe.name}</h3>
                <span class="recipe-type">${recipeType}</span>
            </div>
            <div class="recipe-content">
                ${this.renderRecipeVisual(recipe)}
            </div>
            <div class="recipe-details">
                <button class="details-btn" onclick="app.toggleDetails(${index})">
                    Show Details
                </button>
                <div class="recipe-raw-data" id="details-${index}" style="display: none;">
                    <pre>${JSON.stringify(recipe.data, null, 2)}</pre>
                </div>
            </div>
        `;

        return card;
    }

    renderRecipeVisual(recipe) {
        const machineType = recipe.machineType;

        // Different layouts based on machine type
        if (machineType === 'crafting_table' || recipe.type.includes('crafting')) {
            return this.renderCraftingGrid(recipe);
        } else if (machineType === 'smelting' || machineType === 'blasting' || machineType === 'smoking') {
            return this.renderSmelting(recipe);
        } else {
            return this.renderGenericMachine(recipe);
        }
    }

    renderCraftingGrid(recipe) {
        if (recipe.format === 'addShaped') {
            return this.renderShapedCrafting(recipe);
        } else if (recipe.format === 'addShapeless') {
            return this.renderShapelessCrafting(recipe);
        }
        return this.renderGenericMachine(recipe);
    }

    renderShapedCrafting(recipe) {
        try {
            // Parse the CraftTweaker pattern format
            const pattern = recipe.data.pattern;
            const grid = this.parseCraftingPattern(pattern);

            return `
                <div class="crafting-recipe">
                    <div class="crafting-grid">
                        ${this.renderCraftingGrid3x3(grid)}
                    </div>
                    <div class="arrow">→</div>
                    <div class="crafting-result">
                        ${this.renderCraftingOutput(recipe.data.output)}
                    </div>
                </div>
            `;
        } catch (error) {
            console.warn('Failed to render shaped crafting recipe:', error);
            return this.renderGenericMachine(recipe);
        }
    }

    renderShapelessCrafting(recipe) {
        try {
            const ingredients = this.parseCraftingIngredients(recipe.data.ingredients);

            return `
                <div class="crafting-recipe">
                    <div class="shapeless-ingredients">
                        <h4>Ingredients:</h4>
                        <div class="ingredients-grid">
                            ${ingredients.map(item => this.renderCraftingSlot(item)).join('')}
                        </div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="crafting-result">
                        ${this.renderCraftingOutput(recipe.data.output)}
                    </div>
                </div>
            `;
        } catch (error) {
            console.warn('Failed to render shapeless crafting recipe:', error);
            return this.renderGenericMachine(recipe);
        }
    }

    parseCraftingPattern(patternString) {
        // Extract the pattern array from CraftTweaker format
        // Example: [[item1, item2, item3], [item4, empty, item6], [...]]
        try {
            const grid = Array(3).fill().map(() => Array(3).fill(null));

            // Parse the pattern string (it's a nested array in string format)
            const matches = patternString.match(/\[([^\]]+)\]/g);
            if (!matches) return grid;

            matches.forEach((row, rowIndex) => {
                if (rowIndex >= 3) return;

                // Extract items from each row
                const items = row.slice(1, -1).split(',').map(s => s.trim());
                items.forEach((item, colIndex) => {
                    if (colIndex >= 3) return;

                    if (item.includes('IIngredientEmpty') || item === 'null') {
                        grid[rowIndex][colIndex] = null;
                    } else {
                        grid[rowIndex][colIndex] = item;
                    }
                });
            });

            return grid;
        } catch (error) {
            console.warn('Failed to parse crafting pattern:', error);
            return Array(3).fill().map(() => Array(3).fill(null));
        }
    }

    parseCraftingIngredients(ingredientsString) {
        try {
            // Parse the ingredients array from CraftTweaker format
            const items = ingredientsString.slice(1, -1).split(',').map(s => s.trim());
            return items.filter(item => !item.includes('IIngredientEmpty'));
        } catch (error) {
            console.warn('Failed to parse crafting ingredients:', error);
            return [];
        }
    }

    renderCraftingGrid3x3(grid) {
        return `
            <div class="grid-3x3">
                ${grid.map(row =>
                    row.map(item => this.renderCraftingSlot(item)).join('')
                ).join('')}
            </div>
        `;
    }

    renderCraftingSlot(item) {
        if (!item || item === 'null') {
            return '<div class="crafting-slot empty"></div>';
        }

        const icon = this.getCraftingItemIcon(item);
        const name = this.getCraftingItemName(item);

        return `
            <div class="crafting-slot filled" title="${name}">
                <div class="slot-icon">${icon}</div>
                <div class="slot-name">${name}</div>
            </div>
        `;
    }

    renderCraftingOutput(outputString) {
        const icon = this.getCraftingItemIcon(outputString);
        const name = this.getCraftingItemName(outputString);

        return `
            <div class="crafting-output">
                <div class="output-slot">
                    <div class="slot-icon">${icon}</div>
                    <div class="slot-name">${name}</div>
                </div>
            </div>
        `;
    }

    getCraftingItemIcon(itemString) {
        if (!itemString) return '';

        const lower = itemString.toLowerCase();
        if (lower.includes('ingot')) return '🧱';
        if (lower.includes('ore')) return '⛏️';
        if (lower.includes('dust')) return '💨';
        if (lower.includes('plate')) return '📄';
        if (lower.includes('stick')) return '🪵';
        if (lower.includes('diamond')) return '💎';
        if (lower.includes('gold')) return '🪙';
        if (lower.includes('iron')) return '⚙️';
        if (lower.includes('copper')) return '🔶';
        if (lower.includes('leather')) return '🟤';
        if (lower.includes('string')) return '🧵';
        if (lower.includes('chest')) return '📦';
        if (lower.includes('backpack')) return '🎒';
        return '📦';
    }

    getCraftingItemName(itemString) {
        if (!itemString) return '';

        // Extract item name from <item:mod:name> or <tag:category:name> format
        const itemMatch = itemString.match(/<(?:item|tag):([^>]+)>/);
        if (itemMatch) {
            return itemMatch[1].replace(/^[^:]+:/, '').replace(/_/g, ' ');
        }

        // Fallback for other formats
        return itemString.replace(/^[^:]+:/, '').replace(/_/g, ' ').replace(/[<>]/g, '');
    }

    renderSmelting(recipe) {
        return `
            <div class="smelting-recipe">
                <div class="smelting-input">
                    ${this.renderItems(recipe.inputs.items)}
                </div>
                <div class="arrow">→</div>
                <div class="smelting-output">
                    ${this.renderItems(recipe.outputs.items)}
                </div>
            </div>
        `;
    }

    renderGenericMachine(recipe) {
        const hasInputs = recipe.inputs.items.length > 0 || recipe.inputs.fluids.length > 0;
        const hasOutputs = recipe.outputs.items.length > 0 || recipe.outputs.fluids.length > 0;

        return `
            <div class="generic-recipe">
                ${hasInputs ? `
                    <div class="recipe-inputs">
                        <h4>Inputs:</h4>
                        ${this.renderItems(recipe.inputs.items)}
                        ${this.renderFluids(recipe.inputs.fluids)}
                    </div>
                ` : ''}

                ${hasInputs && hasOutputs ? '<div class="arrow">→</div>' : ''}

                ${hasOutputs ? `
                    <div class="recipe-outputs">
                        <h4>Outputs:</h4>
                        ${this.renderItems(recipe.outputs.items)}
                        ${this.renderFluids(recipe.outputs.fluids)}
                    </div>
                ` : ''}

                ${this.renderRecipeProperties(recipe)}
            </div>
        `;
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
                            ${item.amount ? `<div class="item-amount">×${item.amount}</div>` : ''}
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
                        <div class="fluid-icon">🧪</div>
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

        return `
            <div class="recipe-properties">
                ${properties.map(prop => `<span class="property">${prop}</span>`).join('')}
            </div>
        `;
    }

    getItemIcon(item) {
        // Simple icon mapping - could be expanded
        if (item.item && item.item.includes('ingot')) return '🧱';
        if (item.item && item.item.includes('ore')) return '⛏️';
        if (item.item && item.item.includes('dust')) return '💨';
        if (item.item && item.item.includes('plate')) return '📄';
        if (item.tag && item.tag.includes('ingots')) return '🧱';
        if (item.tag && item.tag.includes('ores')) return '⛏️';
        return '📦';
    }

    getItemName(item) {
        if (item.item) {
            return item.item.replace(/^[^:]+:/, '').replace(/_/g, ' ');
        }
        if (item.tag) {
            return `#${item.tag}`;
        }
        return 'Unknown Item';
    }

    getFluidName(fluid) {
        if (fluid.fluid) {
            return fluid.fluid.replace(/^[^:]+:/, '').replace(/_/g, ' ');
        }
        if (fluid.id) {
            return fluid.id.replace(/^[^:]+:/, '').replace(/_/g, ' ');
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

    updateRecipeCount(total) {
        document.getElementById('recipe-count').textContent = `(${total} recipes)`;
    }

    renderPagination() {
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