/**
 * Manages loading state and progress for 3D models
 */
export class LoadingManager {
    constructor(loadingElementId = 'loading') {
        this.loadingElement = document.getElementById(loadingElementId);
        this.progressText = null;
        this.loaderDot = null;
        this.totalItems = 0;
        this.loadedItems = 0;
        this.setupProgressDisplay();
    }

    /**
     * Setup progress display elements
     */
    setupProgressDisplay() {
        if (!this.loadingElement) return;

        // Find or create progress text element
        this.progressText = this.loadingElement.querySelector('p');
        if (!this.progressText) {
            this.progressText = document.createElement('p');
            this.progressText.style.marginTop = '20px';
            this.progressText.style.color = 'rgba(245, 240, 232, 0.7)';
            this.loadingElement.appendChild(this.progressText);
        }

        this.loaderDot = this.loadingElement.querySelector('.loader');
    }

    /**
     * Set total number of items to load
     * @param {number} total - Total items count
     */
    setTotal(total) {
        this.totalItems = total;
        this.loadedItems = 0;
        this.updateProgress();
    }

    /**
     * Increment loaded items count
     * @param {string} [itemName] - Optional name of loaded item
     */
    incrementLoaded(itemName = '') {
        this.loadedItems++;
        this.updateProgress(itemName);
    }

    /**
     * Update progress display
     * @param {string} [itemName] - Optional current item name
     */
    updateProgress(itemName = '') {
        if (!this.progressText) return;

        const percentage = this.totalItems > 0
            ? Math.round((this.loadedItems / this.totalItems) * 100)
            : 0;

        let text = `Načítám... ${this.loadedItems}/${this.totalItems}`;
        if (percentage > 0) {
            text += ` (${percentage}%)`;
        }
        if (itemName) {
            text += `\n${itemName}`;
        }

        this.progressText.textContent = text;
    }

    /**
     * Show loading screen
     */
    show() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('hidden');
            this.loadingElement.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen with fade out
     */
    hide() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');

            // Wait for fade out animation before hiding
            setTimeout(() => {
                this.loadingElement.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Set custom loading message
     * @param {string} message - Message to display
     */
    setMessage(message) {
        if (this.progressText) {
            this.progressText.textContent = message;
        }
    }

    /**
     * Show error message
     * @param {string} error - Error message
     */
    showError(error) {
        if (this.progressText) {
            this.progressText.textContent = `Chyba: ${error}`;
            this.progressText.style.color = '#ff6b6b';
        }
        if (this.loaderDot) {
            this.loaderDot.style.display = 'none';
        }
    }

    /**
     * Reset loading state
     */
    reset() {
        this.totalItems = 0;
        this.loadedItems = 0;
        if (this.progressText) {
            this.progressText.textContent = 'Načítám...';
            this.progressText.style.color = 'rgba(245, 240, 232, 0.7)';
        }
        if (this.loaderDot) {
            this.loaderDot.style.display = 'block';
        }
    }
}
