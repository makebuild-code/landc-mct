/**
 * Date.js
 * Handles date, time, and datetime inputs with enhanced UI
 */

export class DateInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize date input handling
     * @private
     */
    _init() {
        // Find all date inputs
        const dateInputs = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[type="date"], 
             ${this.options.inputSelector}[type="time"], 
             ${this.options.inputSelector}[type="datetime-local"],
             ${this.options.inputSelector}[data-fc-date]`
        );
        
        // Add event listeners to each date input
        dateInputs.forEach(dateInput => {
            // If enhanced UI is requested, apply it
            if (dateInput.hasAttribute('data-fc-enhanced')) {
                this._enhanceDateInput(dateInput);
            }
            
            // Handle change event
            dateInput.addEventListener('change', () => {
                // Clear any errors on change
                this.formChippy.validation.clearInputError(dateInput);
                
                // Auto-advance if enabled
                if (dateInput.hasAttribute('data-fc-auto-advance')) {
                    // Find the slide containing this input
                    const slide = dateInput.closest(this.options.slideSelector);
                    const slideIndex = this.formChippy.slides.indexOf(slide);
                    
                    // Go to next slide if not the last slide
                    if (slideIndex < this.formChippy.totalSlides - 1) {
                        // Short delay to show selection before advancing
                        setTimeout(() => {
                            this.formChippy.goToSlide(slideIndex + 1);
                        }, 300);
                    }
                }
            });
            
            // Handle validation
            dateInput.addEventListener('blur', () => {
                // Validate if required
                if ((dateInput.hasAttribute('required') || dateInput.hasAttribute('data-fc-required')) && !dateInput.value) {
                    this.formChippy.validation.showInputError(dateInput, 'This field is required');
                }
                
                // Validate min/max dates
                if (dateInput.value) {
                    const inputValue = new Date(dateInput.value);
                    
                    // Check min date
                    if (dateInput.hasAttribute('min')) {
                        const minDate = new Date(dateInput.getAttribute('min'));
                        if (inputValue < minDate) {
                            const minFormatted = this._formatDate(minDate, dateInput.type);
                            this.formChippy.validation.showInputError(dateInput, 
                                `Please select a date on or after ${minFormatted}`);
                        }
                    }
                    
                    // Check max date
                    if (dateInput.hasAttribute('max')) {
                        const maxDate = new Date(dateInput.getAttribute('max'));
                        if (inputValue > maxDate) {
                            const maxFormatted = this._formatDate(maxDate, dateInput.type);
                            this.formChippy.validation.showInputError(dateInput, 
                                `Please select a date on or before ${maxFormatted}`);
                        }
                    }
                }
            });
        });
    }
    
    /**
     * Format a date object based on the input type
     * @param {Date} date - The date to format
     * @param {string} type - The input type (date, time, datetime-local)
     * @returns {string} - Formatted date string
     * @private
     */
    _formatDate(date, type) {
        if (type === 'time') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (type === 'datetime-local') {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString();
        }
    }
    
    /**
     * Enhance a date input with better UI
     * @param {HTMLInputElement} dateInput - The date input element
     * @private
     */
    _enhanceDateInput(dateInput) {
        // Skip if already enhanced
        if (dateInput.closest('.fc-date-container')) return;
        
        // Create container
        const container = document.createElement('div');
        container.className = 'fc-date-container';
        
        // Get input type
        const inputType = dateInput.type || 'date';
        container.setAttribute('data-fc-date-type', inputType);
        
        // Insert container before input
        dateInput.parentNode.insertBefore(container, dateInput);
        
        // Move input inside container
        container.appendChild(dateInput);
        
        // Create calendar icon
        const icon = document.createElement('span');
        icon.className = 'fc-date-icon';
        
        // Set icon based on input type
        if (inputType === 'time') {
            icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"></path></svg>';
        } else {
            icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="currentColor"></path></svg>';
        }
        
        container.appendChild(icon);
        
        // Create display element (for showing formatted date)
        const display = document.createElement('div');
        display.className = 'fc-date-display';
        
        // Set initial display text
        if (dateInput.value) {
            display.textContent = this._formatDate(new Date(dateInput.value), inputType);
        } else {
            display.textContent = dateInput.getAttribute('placeholder') || 'Select date';
            display.classList.add('fc-date-placeholder');
        }
        
        container.appendChild(display);
        
        // Add event listeners
        container.addEventListener('click', () => {
            dateInput.focus();
            if (inputType === 'date' || inputType === 'datetime-local') {
                // For mobile, we might need to create a custom calendar
                // This is a simple solution that uses the native picker
                dateInput.showPicker && dateInput.showPicker();
            }
        });
        
        // Update display when value changes
        dateInput.addEventListener('change', () => {
            if (dateInput.value) {
                display.textContent = this._formatDate(new Date(dateInput.value), inputType);
                display.classList.remove('fc-date-placeholder');
            } else {
                display.textContent = dateInput.getAttribute('placeholder') || 'Select date';
                display.classList.add('fc-date-placeholder');
            }
        });
        
        // Hide the actual input for better UI
        dateInput.classList.add('fc-date-input-enhanced');
    }
    
    /**
     * Create a date input with the specified configuration
     * @param {HTMLElement} container - The container to append the date input to
     * @param {object} config - Configuration options
     * @returns {HTMLInputElement} The created date input
     */
    createDateInput(container, config) {
        const {
            name,
            id = name,
            type = 'date',
            placeholder = type === 'date' ? 'Select date' : 
                         type === 'time' ? 'Select time' : 'Select date and time',
            value = '',
            min,
            max,
            required = false,
            autoAdvance = false,
            enhanced = true,
            label = '',
            step
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
        
        // Create date input
        const dateInput = document.createElement('input');
        dateInput.type = type;
        dateInput.id = id;
        dateInput.name = name;
        dateInput.placeholder = placeholder;
        dateInput.setAttribute('data-fc-input', '');
        dateInput.setAttribute('data-fc-date', '');
        
        // Set additional attributes
        if (value) dateInput.value = value;
        if (min) dateInput.setAttribute('min', min);
        if (max) dateInput.setAttribute('max', max);
        if (step) dateInput.setAttribute('step', step);
        if (required) {
            dateInput.required = true;
            dateInput.setAttribute('data-fc-required', '');
        }
        if (autoAdvance) dateInput.setAttribute('data-fc-auto-advance', '');
        if (enhanced) dateInput.setAttribute('data-fc-enhanced', '');
        
        // Add date input to wrapper
        wrapper.appendChild(dateInput);
        
        // Add wrapper to container
        container.appendChild(wrapper);
        
        // Enhance date input if enabled
        if (enhanced) {
            this._enhanceDateInput(dateInput);
        }
        
        return dateInput;
    }
    
    /**
     * Create a date range input with start and end dates
     * @param {HTMLElement} container - The container to append the date range to
     * @param {object} config - Configuration options
     * @returns {object} An object containing the start and end date inputs
     */
    createDateRangeInput(container, config) {
        const {
            startName,
            endName,
            startId = startName,
            endId = endName,
            type = 'date',
            startPlaceholder = 'Start date',
            endPlaceholder = 'End date',
            startValue = '',
            endValue = '',
            min,
            max,
            required = false,
            enhanced = true,
            label = ''
        } = config;
        
        // Create form group wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-form-group';
        
        // Add label if provided
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            wrapper.appendChild(labelEl);
        }
        
        // Create date range container
        const rangeContainer = document.createElement('div');
        rangeContainer.className = 'fc-date-range';
        
        // Create start date input
        const startDateConfig = {
            name: startName,
            id: startId,
            type,
            placeholder: startPlaceholder,
            value: startValue,
            min,
            max,
            required,
            enhanced,
            label: '' // No inner label for range inputs
        };
        
        const startDateWrapper = document.createElement('div');
        startDateWrapper.className = 'fc-date-range-start';
        rangeContainer.appendChild(startDateWrapper);
        
        const startDate = this.createDateInput(startDateWrapper, startDateConfig);
        
        // Create range separator
        const separator = document.createElement('span');
        separator.className = 'fc-date-range-separator';
        separator.textContent = 'to';
        rangeContainer.appendChild(separator);
        
        // Create end date input
        const endDateConfig = {
            name: endName,
            id: endId,
            type,
            placeholder: endPlaceholder,
            value: endValue,
            min: startValue || min, // Start with the same min as start date
            max,
            required,
            enhanced,
            label: '' // No inner label for range inputs
        };
        
        const endDateWrapper = document.createElement('div');
        endDateWrapper.className = 'fc-date-range-end';
        rangeContainer.appendChild(endDateWrapper);
        
        const endDate = this.createDateInput(endDateWrapper, endDateConfig);
        
        // Add range container to wrapper
        wrapper.appendChild(rangeContainer);
        
        // Add wrapper to container
        container.appendChild(wrapper);
        
        // Set up interdependent validation
        startDate.addEventListener('change', () => {
            if (startDate.value) {
                // Update end date min value to be the selected start date
                endDate.min = startDate.value;
                
                // Show error if end date is before start date
                if (endDate.value && new Date(endDate.value) < new Date(startDate.value)) {
                    this.formChippy.validation.showInputError(endDate, 
                        'End date must be after start date');
                }
            }
        });
        
        endDate.addEventListener('change', () => {
            if (endDate.value && startDate.value) {
                // Show error if end date is before start date
                if (new Date(endDate.value) < new Date(startDate.value)) {
                    this.formChippy.validation.showInputError(endDate, 
                        'End date must be after start date');
                }
            }
        });
        
        return { startDate, endDate };
    }
}
