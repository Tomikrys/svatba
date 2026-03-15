/**
 * Google Forms RSVP Integration
 * Form ID: 1FAIpQLSen4ps9fht7vUBWoYgcWFs8dKn1hhU8fmnfQKsGaS2uZ1Rwtw
 * 
 * Entry IDs mapping:
 * - entry.1159134042 - Tvůj email
 * - entry.615226643 - Počet osob (1-10)
 * - entry.1223671287 - Jména těch, co přihlašuješ
 * - entry.1278688020 - Jedete na obřad nebo aj na veselku? (Jen na obřad / Jen na veselku / Na obřad i veselku)
 * - entry.785943596 - Jak se plánujete přemístit (Autem / Vlakem)
 * - entry.1316017605 - Kolik osob vzít autem (1-6)
 * - entry.373402070 - Budete potřebovat odvézt? (Ano / Ne)
 * - entry.1111160905 - Chtěli byste pomoct s organizací?
 * - entry.1075244693 - Co se jinam nevešlo (alergie atd..)
 * - entry.995089869 - Přání na písničku
 */

const GOOGLE_FORM_ID = '1FAIpQLSen4ps9fht7vUBWoYgcWFs8dKn1hhU8fmnfQKsGaS2uZ1Rwtw';
const GOOGLE_FORM_URL = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;

// Entry IDs for each field
const ENTRY_IDS = {
    email: '1159134042',
    guestCount: '615226643',
    names: '1223671287',
    attendance: '1278688020',
    transport: '785943596',
    carSeats: '1316017605',
    needRide: '373402070',
    helpOffer: '1111160905',
    notes: '1075244693',
    songRequest: '995089869'
};

/**
 * Handles RSVP form submission to Google Forms
 */
export class RSVPForm {
    constructor(formId = 'rsvpForm') {
        this.formId = formId;
        this.form = null;
        this.isSubmitting = false;
        this.hiddenIframe = null;
    }

    /**
     * Initialize form with event listeners
     */
    init() {
        // Wait for form to exist in DOM
        const checkForm = () => {
            this.form = document.getElementById(this.formId);
            if (this.form) {
                this.createHiddenIframe();
                this.attachListeners();
                this.setupConditionalFields();
            } else {
                // Try again after a short delay (form might not be rendered yet)
                setTimeout(checkForm, 100);
            }
        };
        checkForm();
    }

    /**
     * Create hidden iframe for form submission
     */
    createHiddenIframe() {
        if (!this.hiddenIframe) {
            this.hiddenIframe = document.createElement('iframe');
            this.hiddenIframe.id = 'hidden_gform_iframe';
            this.hiddenIframe.name = 'hidden_gform_iframe';
            this.hiddenIframe.style.display = 'none';
            document.body.appendChild(this.hiddenIframe);
        }
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

        // Reset button
        const resetBtn = this.form.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetForm();
            });
        }
    }

    /**
     * Setup conditional field visibility
     */
    setupConditionalFields() {
        // Show custom guest count input when "8+" is selected
        const guestCountRadios = this.form.querySelectorAll('input[name="guestCount"]');
        const guestCountCustom = this.form.querySelector('.guest-count-custom');
        
        if (guestCountRadios.length && guestCountCustom) {
            guestCountRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'other' && radio.checked) {
                        guestCountCustom.style.display = 'block';
                        // Focus the custom input
                        const customInput = guestCountCustom.querySelector('input');
                        if (customInput) customInput.focus();
                    } else if (radio.checked) {
                        guestCountCustom.style.display = 'none';
                    }
                });
            });
        }

        // Show car seats field only when transport is "Autem"
        const transportRadios = this.form.querySelectorAll('input[name="transport"]');
        const carSeatsField = this.form.querySelector('.car-seats-field');
        
        if (transportRadios.length && carSeatsField) {
            transportRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'Autem' && radio.checked) {
                        carSeatsField.style.display = 'block';
                    } else if (radio.checked) {
                        carSeatsField.style.display = 'none';
                    }
                });
            });
        }

        // Show transport/ride fields and party-related fields only when attendance includes veselka
        const attendanceRadios = this.form.querySelectorAll('input[name="attendance"]');
        const transportSection = this.form.querySelector('.transport-section');
        const partySection = this.form.querySelector('.party-fields');
        
        // Also find help offer and song request fields by name
        const helpOfferField = this.form.querySelector('[name="helpOffer"]')?.closest('.form-group');
        const songRequestField = this.form.querySelector('[name="songRequest"]')?.closest('.form-group');
        
        if (attendanceRadios.length) {
            attendanceRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const isCeremonyOnly = radio.value === 'Jen na obřad' && radio.checked;
                    
                    // Transport section (only relevant if attending veselka)
                    if (transportSection) {
                        transportSection.style.display = isCeremonyOnly ? 'none' : 'block';
                    }
                    
                    // Party-related fields container
                    if (partySection) {
                        partySection.style.display = isCeremonyOnly ? 'none' : 'block';
                    }
                    
                    // Help offer field (only relevant for veselka)
                    if (helpOfferField) {
                        helpOfferField.style.display = isCeremonyOnly ? 'none' : 'block';
                    }
                    
                    // Song request field (only relevant for veselka)
                    if (songRequestField) {
                        songRequestField.style.display = isCeremonyOnly ? 'none' : 'block';
                    }
                });
            });
        }
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

        let isValid = true;

        // Required: names
        const namesField = this.form.querySelector('[name="names"]');
        if (namesField && !namesField.value.trim()) {
            this.showFieldError(namesField, 'Vyplňte prosím jména');
            isValid = false;
        }

        // Required: attendance
        const attendanceChecked = this.form.querySelector('input[name="attendance"]:checked');
        if (!attendanceChecked) {
            const attendanceGroup = this.form.querySelector('.attendance-group');
            if (attendanceGroup) {
                let errorEl = attendanceGroup.querySelector('.field-error');
                if (!errorEl) {
                    errorEl = document.createElement('span');
                    errorEl.className = 'field-error';
                    attendanceGroup.appendChild(errorEl);
                }
                errorEl.textContent = 'Vyberte prosím účast';
            }
            isValid = false;
        }

        return isValid;
    }

    /**
     * Get form data mapped to Google Form entry IDs
     * @returns {URLSearchParams} Form data as URL parameters
     */
    getFormData() {
        if (!this.form) return new URLSearchParams();

        const formData = new URLSearchParams();

        // Email
        const email = this.form.querySelector('[name="email"]');
        if (email?.value) {
            formData.append(`entry.${ENTRY_IDS.email}`, email.value);
        }

        // Guest count (check for custom value if "other" is selected)
        const guestCount = this.form.querySelector('[name="guestCount"]:checked');
        if (guestCount?.value) {
            if (guestCount.value === 'other') {
                // Use the custom input value
                const customCount = this.form.querySelector('[name="guestCountCustom"]');
                if (customCount?.value) {
                    formData.append(`entry.${ENTRY_IDS.guestCount}`, customCount.value);
                }
            } else {
                formData.append(`entry.${ENTRY_IDS.guestCount}`, guestCount.value);
            }
        }

        // Names
        const names = this.form.querySelector('[name="names"]');
        if (names?.value) {
            formData.append(`entry.${ENTRY_IDS.names}`, names.value);
        }

        // Attendance type
        const attendance = this.form.querySelector('[name="attendance"]:checked');
        if (attendance?.value) {
            formData.append(`entry.${ENTRY_IDS.attendance}`, attendance.value);
        }

        // Transport
        const transport = this.form.querySelector('[name="transport"]:checked');
        if (transport?.value) {
            formData.append(`entry.${ENTRY_IDS.transport}`, transport.value);
        }

        // Car seats
        const carSeats = this.form.querySelector('[name="carSeats"]:checked');
        if (carSeats?.value) {
            formData.append(`entry.${ENTRY_IDS.carSeats}`, carSeats.value);
        }

        // Need ride
        const needRide = this.form.querySelector('[name="needRide"]:checked');
        if (needRide?.value) {
            formData.append(`entry.${ENTRY_IDS.needRide}`, needRide.value);
        }

        // Help offer
        const helpOffer = this.form.querySelector('[name="helpOffer"]');
        if (helpOffer?.value) {
            formData.append(`entry.${ENTRY_IDS.helpOffer}`, helpOffer.value);
        }

        // Notes/allergies
        const notes = this.form.querySelector('[name="notes"]');
        if (notes?.value) {
            formData.append(`entry.${ENTRY_IDS.notes}`, notes.value);
        }

        // Song request
        const songRequest = this.form.querySelector('[name="songRequest"]');
        if (songRequest?.value) {
            formData.append(`entry.${ENTRY_IDS.songRequest}`, songRequest.value);
        }

        return formData;
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
        const originalText = submitBtn?.textContent || 'Odeslat';
        if (submitBtn) {
            submitBtn.textContent = 'Odesílám...';
            submitBtn.disabled = true;
        }

        try {
            // Get form data as URL parameters
            const formData = this.getFormData();
            
            // Submit via hidden iframe
            const formUrl = `${GOOGLE_FORM_URL}?${formData.toString()}`;
            this.hiddenIframe.src = formUrl;

            // Show success after a short delay (Google doesn't send CORS response)
            setTimeout(() => {
                this.showMessage('Děkujeme! Vaše účast byla potvrzena. 💒', 'success');
                this.showSuccessState();
            }, 500);

        } catch (error) {
            console.error('Form submission error:', error);
            this.showMessage('Nepodařilo se odeslat formulář. Zkuste to prosím později.', 'error');
            this.isSubmitting = false;
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Show success state after submission
     */
    showSuccessState() {
        const formContainer = this.form?.closest('.form-container');
        if (!formContainer) return;

        // Hide form and show success message
        this.form.style.display = 'none';
        
        let successEl = formContainer.querySelector('.form-success');
        if (!successEl) {
            successEl = document.createElement('div');
            successEl.className = 'form-success';
            successEl.innerHTML = `
                <div class="success-icon">💒</div>
                <h3>Děkujeme!</h3>
                <p>Vaše přihláška byla odeslána.<br>Těšíme se na vás!</p>
                <button type="button" class="reset-form-btn">Odeslat další odpověď</button>
            `;
            formContainer.appendChild(successEl);
            
            // Add reset handler
            const resetBtn = successEl.querySelector('.reset-form-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.resetForm();
                    successEl.style.display = 'none';
                    this.form.style.display = 'block';
                });
            }
        }
        successEl.style.display = 'block';
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        if (!this.form) return;

        this.form.reset();
        this.isSubmitting = false;
        
        const submitBtn = this.form.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.textContent = 'Odeslat ❤️';
            submitBtn.disabled = false;
        }

        // Hide conditional fields
        const guestCountCustom = this.form.querySelector('.guest-count-custom');
        if (guestCountCustom) guestCountCustom.style.display = 'none';
        
        const carSeatsField = this.form.querySelector('.car-seats-field');
        if (carSeatsField) carSeatsField.style.display = 'none';
        
        const transportSection = this.form.querySelector('.transport-section');
        if (transportSection) transportSection.style.display = 'none';
        
        // Hide party-related fields (they'll be shown when a veselka attendance is selected)
        const helpOfferField = this.form.querySelector('[name="helpOffer"]')?.closest('.form-group');
        const songRequestField = this.form.querySelector('[name="songRequest"]')?.closest('.form-group');
        if (helpOfferField) helpOfferField.style.display = 'none';
        if (songRequestField) songRequestField.style.display = 'none';

        // Clear error messages
        const errors = this.form.querySelectorAll('.field-error');
        errors.forEach(el => el.remove());
        
        const errorFields = this.form.querySelectorAll('.error');
        errorFields.forEach(el => el.classList.remove('error'));

        // Hide success message
        const formContainer = this.form?.closest('.form-container');
        const successEl = formContainer?.querySelector('.form-success');
        if (successEl) successEl.style.display = 'none';

        // Hide form message
        const messageEl = formContainer?.querySelector('.form-message');
        if (messageEl) messageEl.style.display = 'none';
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

        // Auto-hide after 5 seconds for errors
        if (type === 'error') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }
}

// Auto-initialize when form section becomes visible
export function initRSVPForm() {
    const form = new RSVPForm();
    form.init();
    return form;
}