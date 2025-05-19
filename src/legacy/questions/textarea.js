/**
 * Textarea.js
 * Handles textarea inputs with auto-resize and character counting
 */

export class TextareaInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize textarea input handling
     * @private
     */
    _init() {
        // Find all textarea inputs
        const textareas = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[data-fc-textarea], textarea${this.options.inputSelector}`
        );
        
        // Add event listeners to each textarea
        textareas.forEach(textarea => {
            // Enable auto-resize if specified
            if (textarea.hasAttribute('data-fc-auto-resize')) {
                this._setupAutoResize(textarea);
            }
            
            // Set up character counter if specified
            if (textarea.hasAttribute('data-fc-char-count') || textarea.hasAttribute('maxlength')) {
                this._setupCharacterCounter(textarea);
            }
            
            // Handle input events
            textarea.addEventListener('input', () => {
                // Clear any errors on input
                this.formChippy.validation.clearInputError(textarea);
            });
            
            // Handle blur events for validation
            textarea.addEventListener('blur', () => {
                if (textarea.hasAttribute('data-fc-required') || textarea.hasAttribute('required')) {
                    if (!textarea.value.trim()) {
                        this.formChippy.validation.showInputError(textarea, 'This field is required');
                    }
                }
                
                // Check pattern if specified
                if (textarea.hasAttribute('data-fc-pattern')) {
                    const pattern = new RegExp(textarea.getAttribute('data-fc-pattern'));
                    if (textarea.value && !pattern.test(textarea.value)) {
                        const errorMessage = textarea.getAttribute('data-fc-pattern-message') || 'Please match the requested format';
                        this.formChippy.validation.showInputError(textarea, errorMessage);
                    }
                }
                
                // Check min/max length
                if (textarea.hasAttribute('minlength') && textarea.value) {
                    const minLength = parseInt(textarea.getAttribute('minlength'), 10);
                    if (textarea.value.length < minLength) {
                        this.formChippy.validation.showInputError(textarea, `Please lengthen this text to ${minLength} characters or more`);
                    }
                }
            });
        });
    }
    
    /**
     * Set up auto-resize functionality for a textarea
     * @param {HTMLTextAreaElement} textarea - The textarea element
     * @private
     */
    _setupAutoResize(textarea) {
        // Create a hidden div to measure the height
        const heightDiv = document.createElement('div');
        heightDiv.className = 'fc-textarea-height-measure';
        heightDiv.style.position = 'absolute';
        heightDiv.style.visibility = 'hidden';
        heightDiv.style.height = 'auto';
        heightDiv.style.width = textarea.offsetWidth + 'px';
        heightDiv.style.fontFamily = getComputedStyle(textarea).fontFamily;
        heightDiv.style.fontSize = getComputedStyle(textarea).fontSize;
        heightDiv.style.lineHeight = getComputedStyle(textarea).lineHeight;
        heightDiv.style.padding = getComputedStyle(textarea).padding;
        heightDiv.style.border = getComputedStyle(textarea).border;
        heightDiv.style.wordWrap = 'break-word';
        
        // Add the height div to the DOM
        document.body.appendChild(heightDiv);
        
        // Define the resize function
        const resizeTextarea = () => {
            // Copy content and replace new lines with <br>
            heightDiv.innerHTML = textarea.value.replace(/\n/g, '<br>') + '<br>'; // Extra line for padding
            
            // Get the computed height and set it to the textarea
            const newHeight = heightDiv.offsetHeight;
            
            // Check if a min-height is specified
            const minHeight = textarea.getAttribute('data-fc-min-height');
            const maxHeight = textarea.getAttribute('data-fc-max-height');
            
            let finalHeight = newHeight;
            if (minHeight && newHeight < parseInt(minHeight, 10)) {
                finalHeight = parseInt(minHeight, 10);
            }
            if (maxHeight && newHeight > parseInt(maxHeight, 10)) {
                finalHeight = parseInt(maxHeight, 10);
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }
            
            textarea.style.height = 'auto';
            textarea.style.height = finalHeight + 'px';
        };
        
        // Initial resize
        resizeTextarea();
        
        // Resize on input
        textarea.addEventListener('input', resizeTextarea);
        
        // Resize on window resize
        window.addEventListener('resize', () => {
            heightDiv.style.width = textarea.offsetWidth + 'px';
            resizeTextarea();
        });
        
        // Clean up on destroy
        this.formChippy.on('destroy', () => {
            document.body.removeChild(heightDiv);
        });
    }
    
    /**
     * Set up character counter for a textarea
     * @param {HTMLTextAreaElement} textarea - The textarea element
     * @private
     */
    _setupCharacterCounter(textarea) {
        // Get the maximum length if specified
        const maxLength = textarea.getAttribute('maxlength') || 
                          textarea.getAttribute('data-fc-max-length');
        
        // Create the counter element
        const counter = document.createElement('div');
        counter.className = 'fc-char-counter';
        
        // Determine the appropriate message based on whether maxlength is set
        if (maxLength) {
            counter.textContent = `0 / ${maxLength}`;
        } else {
            counter.textContent = '0 characters';
        }
        
        // Insert the counter after the textarea
        textarea.parentNode.insertBefore(counter, textarea.nextSibling);
        
        // Update the counter on input
        const updateCounter = () => {
            const length = textarea.value.length;
            
            if (maxLength) {
                counter.textContent = `${length} / ${maxLength}`;
                
                // Add warning class when approaching the limit
                if (length >= parseInt(maxLength, 10) * 0.9) {
                    counter.classList.add('fc-char-counter-warning');
                } else {
                    counter.classList.remove('fc-char-counter-warning');
                }
            } else {
                counter.textContent = `${length} characters`;
            }
        };
        
        // Initial update
        updateCounter();
        
        // Update on input
        textarea.addEventListener('input', updateCounter);
    }
    
    /**
     * Create a new textarea input
     * @param {HTMLElement} container - The container to append the textarea to
     * @param {object} config - Configuration options
     * @returns {HTMLTextAreaElement} The created textarea
     */
    createTextarea(container, config) {
        const {
            name,
            id = name,
            placeholder = '',
            value = '',
            rows = 4,
            required = false,
            maxLength,
            minLength,
            autoResize = true,
            charCount = true,
            label = '',
            pattern,
            patternMessage,
            minHeight,
            maxHeight
        } = config;
        
        // Create form group wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-form-group';
        
        // Add label if provided
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            wrapper.appendChild(labelEl);
        }
        
        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.name = name;
        textarea.rows = rows;
        textarea.setAttribute('data-fc-input', '');
        textarea.setAttribute('data-fc-textarea', '');
        
        // Set additional attributes
        if (placeholder) textarea.placeholder = placeholder;
        if (value) textarea.value = value;
        if (required) {
            textarea.required = true;
            textarea.setAttribute('data-fc-required', '');
        }
        if (maxLength) textarea.setAttribute('maxlength', maxLength);
        if (minLength) textarea.setAttribute('minlength', minLength);
        if (autoResize) textarea.setAttribute('data-fc-auto-resize', '');
        if (charCount) textarea.setAttribute('data-fc-char-count', '');
        if (pattern) {
            textarea.setAttribute('data-fc-pattern', pattern);
            if (patternMessage) textarea.setAttribute('data-fc-pattern-message', patternMessage);
        }
        if (minHeight) textarea.setAttribute('data-fc-min-height', minHeight);
        if (maxHeight) textarea.setAttribute('data-fc-max-height', maxHeight);
        
        // Add textarea to wrapper
        wrapper.appendChild(textarea);
        
        // Add wrapper to container
        container.appendChild(wrapper);
        
        // Set up auto-resize if enabled
        if (autoResize) {
            this._setupAutoResize(textarea);
        }
        
        // Set up character counter if enabled
        if (charCount || maxLength) {
            this._setupCharacterCounter(textarea);
        }
        
        return textarea;
    }
}
