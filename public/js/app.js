/**
 * Pattern Press - Main Application Logic
 * Extracted from index.html for better organization
 */

function app() {
    return {
        recipes: [],
        allRecipes: [],
        loading: true,
        currentPage: 1,
        recipesPerPage: 6,
        selectedRecipeType: '',
        selectedMod: '',

        get totalRecipes() {
            return this.allRecipes.length;
        },

        get availableMods() {
            const mods = [...new Set(this.allRecipes.map(recipe => recipe.mod))];
            const sortedMods = mods.sort();

            // Put minecraft first, then alphabetical for the rest
            const result = [];
            if (sortedMods.includes('minecraft')) {
                result.push('minecraft');
                sortedMods.splice(sortedMods.indexOf('minecraft'), 1);
            }
            result.push(...sortedMods);

            return result;
        },

        get availableRecipeTypes() {
            const types = [...new Set(this.allRecipes.map(recipe => recipe.type))];
            const sortedTypes = types.sort();

            // Put minecraft recipe types first, then alphabetical for the rest
            const minecraftTypes = sortedTypes.filter(type => type.startsWith('minecraft:'));
            const otherTypes = sortedTypes.filter(type => !type.startsWith('minecraft:'));

            return [...minecraftTypes, ...otherTypes];
        },

        get filteredRecipes() {
            let filtered = this.allRecipes;

            // Filter by mod if selected
            if (this.selectedMod) {
                filtered = filtered.filter(recipe => recipe.mod === this.selectedMod);
            }

            // Filter by recipe type if selected
            if (this.selectedRecipeType) {
                filtered = filtered.filter(recipe => recipe.type === this.selectedRecipeType);
            }

            return filtered;
        },

        get totalPages() {
            return Math.ceil(this.filteredRecipes.length / this.recipesPerPage);
        },

        get paginatedRecipes() {
            const start = (this.currentPage - 1) * this.recipesPerPage;
            const end = start + this.recipesPerPage;
            return this.filteredRecipes.slice(start, end);
        },

        async loadRecipes() {
            try {
                this.loading = true;
                const response = await fetch('/recipes?limit=20000');
                const data = await response.json();
                this.allRecipes = data.recipes || [];
                this.recipes = this.allRecipes;
            } catch (error) {
                console.error('Failed to load recipes:', error);
                this.allRecipes = [];
                this.recipes = [];
            } finally {
                this.loading = false;
            }
        },

        filterRecipes() {
            this.currentPage = 1; // Reset to first page when filtering
        },

        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },

        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },

        setupKeyboardNavigation() {
            // Setup is complete when this function runs
        },

        handleKeydown(event) {
            // Ignore if user is typing in an input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            switch(event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    this.prevPage();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.nextPage();
                    break;
                case 'j':
                case 'ArrowDown':
                    event.preventDefault();
                    this.scrollToNextRecipe();
                    break;
                case 'k':
                case 'ArrowUp':
                    event.preventDefault();
                    this.scrollToPrevRecipe();
                    break;
                case '/':
                    event.preventDefault();
                    // Focus on first select element (mod filter)
                    document.getElementById('mod').focus();
                    break;
            }
        },

        scrollToNextRecipe() {
            // Simple implementation - scroll down by one recipe card height
            window.scrollBy(0, 200);
        },

        scrollToPrevRecipe() {
            // Simple implementation - scroll up by one recipe card height
            window.scrollBy(0, -200);
        }
    }
}

// Make app function available globally
window.app = app;