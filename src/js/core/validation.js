/**
 * Validation.js
 * Handles form input validation
 */

export class Validation {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
    }
    
    /**
     * Validate a slide's inputs
     * @param {HTMLElement} slide - The slide to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateSlide(slide) {
        const slideId = slide.getAttribute('data-fc-slide');
        
        // Check if validation is enabled via the data attribute
        if (!this.formChippy.validationEnabled) {
            this.formChippy.debug.info(`Validation skipped (disabled) for slide: ${slideId}`);
            return true; // Skip validation and return valid
        }
        
        this.formChippy.debug.info(`Validating slide: ${slideId}`);
        
        const inputs = slide.querySelectorAll(this.options.inputSelector);
        let isValid = true;

        inputs.forEach((input) => {
            // Clear previous errors
            this.clearInputError(input);

            // Skip if not required and empty
            if (
                !input.hasAttribute('required') &&
                input.value.trim() === ''
            ) {
                return;
            }

            // Check if empty
            if (
                input.hasAttribute('required') &&
                input.value.trim() === ''
            ) {
                this.showInputError(input, 'This field is required');
                isValid = false;
                return;
            }

            // Email validation
            if (
                input.type === 'email' &&
                input.value.trim() !== '' &&
                !this.validateEmail(input.value)
            ) {
                this.showInputError(
                    input,
                    'Please enter a valid email address'
                );
                isValid = false;
                return;
            }

            // Number validation
            if (input.type === 'number' && input.value.trim() !== '') {
                const min = parseFloat(input.getAttribute('min'));
                const max = parseFloat(input.getAttribute('max'));
                const value = parseFloat(input.value);

                if (isNaN(value)) {
                    this.showInputError(
                        input,
                        'Please enter a valid number'
                    );
                    isValid = false;
                    return;
                }

                if (!isNaN(min) && value < min) {
                    this.showInputError(input, `Minimum value is ${min}`);
                    isValid = false;
                    return;
                }

                if (!isNaN(max) && value > max) {
                    this.showInputError(input, `Maximum value is ${max}`);
                    isValid = false;
                    return;
                }
            }
            
            // Custom validation
            const pattern = input.getAttribute('pattern');
            if (pattern && input.value.trim() !== '') {
                const regex = new RegExp(pattern);
                if (!regex.test(input.value)) {
                    const errorMsg = input.getAttribute('data-error-message') || 
                                    'Please enter a valid value';
                    this.showInputError(input, errorMsg);
                    isValid = false;
                    return;
                }
            }
        });

        return isValid;
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateEmail(email) {
        const re =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    /**
     * Show input error
     * @param {HTMLElement} input - Input element
     * @param {string} message - Error message
     */
    showInputError(input, message) {
        // Log validation error
        this.formChippy.debug.logValidation(input, false, message);
        
        // Check if input is empty and add empty class if needed
        if (input.value.trim() === '') {
            input.classList.add('fc-empty', 'empty');
        } else {
            input.classList.remove('fc-empty', 'empty');
        }
        
        input.style.borderColor = 'var(--fc-error-color, var(--mct-error-color, #ff3860))';
        input.classList.add('fc-error', 'error');

        // Find question container
        const questionContainer =
            input.closest('[data-fc-question]') || input.parentNode;

        // Add error class to the question container
        questionContainer.classList.add('fc-has-error', 'has-error');
        
        // Create error message
        let errorElement =
            questionContainer.querySelector('.fc-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'fc-error-message';
            errorElement.style.color = 'var(--fc-error-color, var(--mct-error-color, #ff3860))';
            errorElement.style.fontSize = '0.875rem';
            errorElement.style.marginTop = '-1rem';
            errorElement.style.marginBottom = '1rem';
            questionContainer.appendChild(errorElement);
        }

        errorElement.textContent = message;

        // Focus the input
        input.focus();
    }

    /**
     * Clear input error
     * @param {HTMLElement} input - Input element
     */
    clearInputError(input) {
        // Log validation success
        if (input.classList.contains('fc-error')) {
            this.formChippy.debug.logValidation(input, true);
        }
        
        input.style.borderColor = '';
        input.classList.remove('fc-error', 'error');
        
        // Check if input is empty and update empty class accordingly
        if (input.value.trim() === '') {
            input.classList.add('fc-empty', 'empty');
        } else {
            input.classList.remove('fc-empty', 'empty');
        }

        // Find question container
        const questionContainer =
            input.closest('[data-fc-question]') || input.parentNode;

        // Remove error class from question container
        questionContainer.classList.remove('fc-has-error', 'has-error');
        
        // Remove error message
        const errorElement =
            questionContainer.querySelector('.fc-error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
}
