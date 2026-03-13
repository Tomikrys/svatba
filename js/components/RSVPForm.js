import { API } from '../config/environment.js';

/**
 * Handles RSVP form submission and validation
 */
export class RSVPForm {
    constructor(formId = 'rsvpForm') {
        this.formId = formId;
        this.form = null;
        this.isSubmitting = false;
    }

    /**
     * Initialize form with event listeners
     */
    init() {
        // Wait for form to exist in DOM
        const checkForm = () => {
            this.form = document.getElementById(this.formId);
            if (this.form) {
                this.attachListeners();
            } else {
                // Try again after a short delay (form might not be rendered yet)
                setTimeout(checkForm, 100);
            }
        };
        checkForm();
    }

    /**
     * Attach form event listeners
     */
    attachListeners() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Real-time validation
        const inputs = this.form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    /**
     * Validate a single form field
     * @param {HTMLElement} field - Form field to validate
     * @returns {boolean} Is valid
     */
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Toto pole je povinné';
        } else if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Zadejte platnou e-mailovou adresu';
            }
        }

        this.showFieldError(field, isValid ? null : errorMessage);
        return isValid;
    }

    /**
     * Show or hide field error message
     * @param {HTMLElement} field - Form field
     * @param {string|null} message - Error message or null to clear
     */
    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        let errorEl = formGroup.querySelector('.field-error');

        if (message) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'field-error';
                formGroup.appendChild(errorEl);
            }
            errorEl.textContent = message;
            field.classList.add('error');
        } else {
            if (errorEl) {
                errorEl.remove();
            }
            field.classList.remove('error');
        }
    }

    /**
     * Validate entire form
     * @returns {boolean} Is form valid
     */
    validateForm() {
        if (!this.form) return false;

        const fields = this.form.querySelectorAll('input, textarea, select');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Get form data as object
     * @returns {object} Form data
     */
    getFormData() {
        if (!this.form) return {};

        const formData = new FormData(this.form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (this.isSubmitting) return;

        // Validate form
        if (!this.validateForm()) {
            this.showMessage('Opravte prosím chyby ve formuláři', 'error');
            return;
        }

        this.isSubmitting = true;
        const submitBtn = this.form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Odesílám...';
        submitBtn.disabled = true;

        try {
            const data = this.getFormData();
            const response = await this.submitToServer(data);

            if (response.success) {
                this.showMessage('Děkujeme! Vaše účast byla potvrzena.', 'success');
                this.form.reset();
            } else {
                throw new Error(response.error || 'Chyba při odesílání');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showMessage('Nepodařilo se odeslat formulář. Zkuste to prosím později.', 'error');
        } finally {
            this.isSubmitting = false;
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Submit form data to server
     * @param {object} data - Form data
     * @returns {Promise<object>} Server response
     */
    async submitToServer(data) {
        // For now, simulate API call (replace with actual endpoint)
        console.log('Submitting form data:', data);

        // Simulated API call
        return new Promise((resolve) => {
            setTimeout(() => {
                // TODO: Replace with actual fetch to API.RSVP_ENDPOINT
                // fetch(API.RSVP_ENDPOINT, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(data)
                // }).then(res => res.json()).then(resolve);

                resolve({ success: true });
            }, 1000);
        });
    }

    /**
     * Show status message to user
     * @param {string} message - Message text
     * @param {string} type - Message type ('success' or 'error')
     */
    showMessage(message, type) {
        const formContainer = this.form?.closest('.form-container');
        if (!formContainer) return;

        let messageEl = formContainer.querySelector('.form-message');

        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'form-message';
            formContainer.insertBefore(messageEl, this.form);
        }

        messageEl.textContent = message;
        messageEl.className = `form-message ${type}`;
        messageEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Auto-initialize when form section becomes visible
export function initRSVPForm() {
    const form = new RSVPForm();
    form.init();
    return form;
}
