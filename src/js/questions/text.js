/**
 * Text.js
 * Handles text, email, and number input types
 */

export class TextInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize text input handling
     * @private
     */
    _init() {
        // Find all text inputs
        const textInputs = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[type="text"], 
             ${this.options.inputSelector}[type="email"], 
             ${this.options.inputSelector}[type="number"], 
             ${this.options.inputSelector}[type="tel"]`
        );
        
        // Add event listeners
        textInputs.forEach(input => {
            // Input validation
            input.addEventListener('input', () => {
                this.formChippy.validation.clearInputError(input);
            });
            
            // Enter key handling
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    // Find the button in the same slide
                    const slide = input.closest(this.options.slideSelector);
                    const button = slide.querySelector(this.options.buttonSelector);
                    
                    if (button) button.click();
                }
            });
        });
    }
    
    /**
     * Format input based on type (if needed)
     * @param {HTMLElement} input - Input element
     */
    formatInput(input) {
        // Add specialized formatting as needed
        // For example, phone number formatting, currency formatting, etc.
        
        if (input.hasAttribute('data-format')) {
            const format = input.getAttribute('data-format');
            
            switch(format) {
                case 'phone':
                    this._formatPhone(input);
                    break;
                case 'currency':
                    this._formatCurrency(input);
                    break;
                // Add other formatting options as needed
            }
        }
    }
    
    /**
     * Format phone number
     * @param {HTMLElement} input - Input element
     * @private
     */
    _formatPhone(input) {
        // Simple phone formatting example
        const value = input.value.replace(/\D/g, '');
        if (value.length <= 10) {
            let formatted = '';
            
            if (value.length > 0) formatted += '(' + value.substring(0, 3);
            if (value.length > 3) formatted += ') ' + value.substring(3, 6);
            if (value.length > 6) formatted += '-' + value.substring(6, 10);
            
            input.value = formatted;
        }
    }
    
    /**
     * Format currency
     * @param {HTMLElement} input - Input element
     * @private
     */
    _formatCurrency(input) {
        // Simple currency formatting example
        const value = parseFloat(input.value.replace(/[^\d.-]/g, ''));
        if (!isNaN(value)) {
            input.value = value.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
            });
        }
    }
}
