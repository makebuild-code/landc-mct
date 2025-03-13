/**
 * Debug.js
 * Provides debugging capabilities for FormChippy
 */

export class Debug {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.enabled = false;
        this.logToConsole = true;
        this.logToUI = false;
        this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
        this.logContainer = null;
        this.logs = [];
        this.maxLogs = 100;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize debug functionality
     * @private
     */
    _init() {
        // Check if debugging is enabled
        const container = this.formChippy.container;
        if (!container) return;
        
        // Check for debug flag in container attributes
        const debugAttr = container.getAttribute('data-fc-debuglog');
        this.enabled = debugAttr === 'true' || debugAttr === '';
        
        // Check for debug options in container attributes
        this.logToConsole = container.getAttribute('data-fc-debuglog-console') !== 'false';
        this.logToUI = container.getAttribute('data-fc-debuglog-ui') === 'true';
        
        // Set log level
        const logLevel = container.getAttribute('data-fc-debuglog-level') || 'info';
        if (['debug', 'info', 'warn', 'error'].includes(logLevel)) {
            this.logLevel = logLevel;
        }
        
        // Create log UI if enabled
        if (this.enabled && this.logToUI) {
            this._createLogUI();
        }
        
        // Log initialization
        if (this.enabled) {
            this.info('FormChippy Debug initialized', {
                level: this.logLevel,
                console: this.logToConsole,
                ui: this.logToUI
            });
            
            // Map slides and inputs for debugging purposes
            this.mapSlidesAndInputs();
        }
    }
    
    /**
     * Create UI for logging
     * @private
     */
    _createLogUI() {
        // Create log container
        this.logContainer = document.createElement('div');
        this.logContainer.className = 'fc-debug-log';
        this.logContainer.innerHTML = `
            <div class="fc-debug-header">
                <h3>FormChippy Debug Log</h3>
                <div class="fc-debug-actions">
                    <button class="fc-debug-clear" title="Clear logs">Clear</button>
                    <button class="fc-debug-minimize" title="Minimize">−</button>
                </div>
            </div>
            <div class="fc-debug-content"></div>
        `;
        
        // Add to DOM
        document.body.appendChild(this.logContainer);
        
        // Get content container
        this.logContent = this.logContainer.querySelector('.fc-debug-content');
        
        // Add validation status indicator to the log content
        const validationStatus = document.createElement('div');
        validationStatus.className = 'fc-debug-validation-status';
        validationStatus.innerHTML = `
            <span class="fc-debug-label">Validation Status:</span>
            <span class="fc-debug-value fc-status-${this.formChippy.validationEnabled ? 'enabled' : 'disabled'}">
                ${this.formChippy.validationEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span class="fc-debug-note">(Set by data-fc-validate attribute)</span>
        `;
        this.logContent.appendChild(validationStatus);
        
        // Set up event listeners
        const clearBtn = this.logContainer.querySelector('.fc-debug-clear');
        clearBtn.addEventListener('click', () => this.clearLogs());
        
        const minimizeBtn = this.logContainer.querySelector('.fc-debug-minimize');
        minimizeBtn.addEventListener('click', () => {
            this.logContainer.classList.toggle('fc-debug-minimized');
            minimizeBtn.textContent = this.logContainer.classList.contains('fc-debug-minimized') ? '+' : '−';
        });
        
        // Make draggable
        this._makeDraggable(this.logContainer);
    }
    
    /**
     * Map all slides and their input fields for debugging
     * Shows the structure of the form and what inputs are in each slide
     * @public
     */
    mapSlidesAndInputs() {
        if (!this.enabled) return;
        
        const slideMap = [];
        const slides = this.formChippy.slides;
        
        this.info('Mapping slides and inputs...');
        
        slides.forEach((slide, index) => {
            // Get slide ID or index if no ID
            const slideId = slide.getAttribute('data-fc-slide') || `slide-${index}`;
            
            // Find all input elements in this slide
            const inputs = slide.querySelectorAll('input, select, textarea');
            const inputMap = [];
            
            inputs.forEach(input => {
                const inputInfo = {
                    type: input.type || input.tagName.toLowerCase(),
                    name: input.name || input.id || 'unnamed-input',
                    id: input.id || '',
                    required: input.required || false,
                    initialValue: input.value || ''
                };
                
                // Add event listener to log value changes
                input.addEventListener('change', () => {
                    this.logInputChange(slideId, inputInfo.name, input.value);
                });
                
                inputMap.push(inputInfo);
            });
            
            slideMap.push({
                index,
                id: slideId,
                title: slide.querySelector('[data-fc-slide-title]')?.textContent || '',
                inputCount: inputs.length,
                inputs: inputMap
            });
        });
        
        // Log the complete map
        this.debug('Form structure map', slideMap);
        
        // Create visual representation if UI logging is enabled
        if (this.logToUI) {
            this._createFormProgressMap(slideMap);
        }
        
        // Save the map for future reference
        this.slideMap = slideMap;
        
        return slideMap;
    }
    
    /**
     * Log when input values change
     * @param {string} slideId - Slide identifier
     * @param {string} inputName - Input field name
     * @param {string} value - New input value
     * @public
     */
    logInputChange(slideId, inputName, value) {
        if (!this.enabled) return;
        
        this.debug(`Input change on slide ${slideId}`, {
            input: inputName,
            value: value,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Get the current values of all inputs in the form
     * @returns {Object} Object with slide IDs as keys and input values as nested objects
     * @public
     */
    getAllFormValues() {
        if (!this.formChippy || !this.formChippy.slides) return {};
        
        const formData = {};
        const slides = this.formChippy.slides;
        
        slides.forEach((slide, index) => {
            const slideId = slide.getAttribute('data-fc-slide') || `slide-${index}`;
            formData[slideId] = {};
            
            // Find all input elements in this slide
            const inputs = slide.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                // Handle different input types
                const name = input.name || input.id || `unnamed-input-${index}`;
                
                if (input.type === 'checkbox' || input.type === 'radio') {
                    formData[slideId][name] = input.checked;
                } else {
                    formData[slideId][name] = input.value;
                }
            });
        });
        
        this.info('Current form values', formData);
        return formData;
    }
    
    /**
     * Create visual form progress map in the debug UI
     * @param {Array} slideMap - Mapped slide data
     * @private
     */
    _createFormProgressMap(slideMap) {
        if (!this.logContainer) return;
        
        // Create container for the form map
        const mapContainer = document.createElement('div');
        mapContainer.className = 'fc-debug-form-map';
        mapContainer.innerHTML = `
            <div class="fc-debug-map-header">
                <h4>Form Structure Map</h4>
                <span class="fc-debug-map-count">${slideMap.length} slides</span>
            </div>
            <div class="fc-debug-map-content"></div>
        `;
        
        const mapContent = mapContainer.querySelector('.fc-debug-map-content');
        
        // Create slide indicators
        slideMap.forEach((slide, i) => {
            const slideEl = document.createElement('div');
            slideEl.className = 'fc-debug-map-slide';
            slideEl.dataset.slideIndex = i;
            slideEl.innerHTML = `
                <div class="fc-debug-map-slide-header">
                    <span class="fc-debug-map-slide-number">${i + 1}</span>
                    <span class="fc-debug-map-slide-title">${slide.title || slide.id}</span>
                    <span class="fc-debug-map-slide-inputs">${slide.inputCount} inputs</span>
                </div>
                <div class="fc-debug-map-slide-inputs-list"></div>
            `;
            
            // Add input fields
            const inputsList = slideEl.querySelector('.fc-debug-map-slide-inputs-list');
            slide.inputs.forEach(input => {
                const inputEl = document.createElement('div');
                inputEl.className = 'fc-debug-map-input';
                inputEl.innerHTML = `
                    <span class="fc-debug-map-input-name">${input.name}</span>
                    <span class="fc-debug-map-input-type">${input.type}</span>
                    ${input.required ? '<span class="fc-debug-map-input-required">required</span>' : ''}
                `;
                inputsList.appendChild(inputEl);
            });
            
            // Add click handler to highlight current slide
            slideEl.addEventListener('click', () => {
                this.formChippy.goToSlide(i);
            });
            
            mapContent.appendChild(slideEl);
        });
        
        // Make current slide indicator update with navigation
        this.formChippy.container.addEventListener('fc:slidechange', (e) => {
            const currentIndex = e.detail.index;
            const slideEls = mapContent.querySelectorAll('.fc-debug-map-slide');
            
            slideEls.forEach((el, i) => {
                if (i === currentIndex) {
                    el.classList.add('fc-debug-map-slide-current');
                } else {
                    el.classList.remove('fc-debug-map-slide-current');
                }
            });
            
            // Also log all current values
            this.getAllFormValues();
        });
        
        // Add the map to the debug UI
        this.logContainer.appendChild(mapContainer);
    }
    
    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     * @private
     */
    _makeDraggable(element) {
        const header = element.querySelector('.fc-debug-header');
        let isDragging = false;
        let offsetX, offsetY;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            
            element.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = '';
        });
    }
    
    /**
     * Log a message with a specified level
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {object} data - Additional data to log
     * @private
     */
    _log(level, message, data = null) {
        if (!this.enabled) return;
        
        // Check log level
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        if (levels[level] < levels[this.logLevel]) return;
        
        // Create log entry
        const timestamp = new Date().toISOString();
        const logEntry = {
            level,
            message,
            data,
            timestamp
        };
        
        // Add to logs array
        this.logs.push(logEntry);
        
        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Log to console
        if (this.logToConsole) {
            const formattedData = data ? JSON.stringify(data, null, 2) : '';
            
            switch (level) {
                case 'debug':
                    console.debug(`[FormChippy Debug] ${message}`, data || '');
                    break;
                case 'info':
                    console.info(`[FormChippy Info] ${message}`, data || '');
                    break;
                case 'warn':
                    console.warn(`[FormChippy Warning] ${message}`, data || '');
                    break;
                case 'error':
                    console.error(`[FormChippy Error] ${message}`, data || '');
                    break;
            }
        }
        
        // Log to UI
        if (this.logToUI && this.logContent) {
            const logItem = document.createElement('div');
            logItem.className = `fc-debug-item fc-debug-${level}`;
            
            const time = new Date(timestamp).toLocaleTimeString();
            
            logItem.innerHTML = `
                <span class="fc-debug-time">${time}</span>
                <span class="fc-debug-level">${level.toUpperCase()}</span>
                <span class="fc-debug-message">${message}</span>
                ${data ? `<pre class="fc-debug-data">${JSON.stringify(data, null, 2)}</pre>` : ''}
            `;
            
            this.logContent.appendChild(logItem);
            
            // Scroll to bottom
            this.logContent.scrollTop = this.logContent.scrollHeight;
        }
        
        return logEntry;
    }
    
    /**
     * Log a debug message
     * @param {string} message - Message to log
     * @param {object} data - Additional data to log
     * @public
     */
    debug(message, data = null) {
        return this._log('debug', message, data);
    }
    
    /**
     * Log an info message
     * @param {string} message - Message to log
     * @param {object} data - Additional data to log
     * @public
     */
    info(message, data = null) {
        return this._log('info', message, data);
    }
    
    /**
     * Log a warning message
     * @param {string} message - Message to log
     * @param {object} data - Additional data to log
     * @public
     */
    warn(message, data = null) {
        return this._log('warn', message, data);
    }
    
    /**
     * Log an error message
     * @param {string} message - Message to log
     * @param {object} data - Additional data to log
     * @public
     */
    error(message, data = null) {
        return this._log('error', message, data);
    }
    
    /**
     * Get all logs
     * @returns {Array} - Array of log entries
     * @public
     */
    getLogs() {
        return [...this.logs];
    }
    
    /**
     * Clear all logs
     * @public
     */
    clearLogs() {
        this.logs = [];
        
        if (this.logContent) {
            this.logContent.innerHTML = '';
        }
        
        if (this.enabled) {
            this.info('Logs cleared');
        }
    }
    
    /**
     * Toggle debug logging
     * @param {boolean} enabled - Whether to enable logging
     * @public
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (this.logContainer) {
            this.logContainer.style.display = enabled ? 'block' : 'none';
        }
        
        if (enabled) {
            this.info('Debug logging enabled');
        }
    }
    
    /**
     * Set the log level
     * @param {string} level - Log level (debug, info, warn, error)
     * @public
     */
    setLogLevel(level) {
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
            this.logLevel = level;
            
            if (this.enabled) {
                this.info(`Log level set to ${level}`);
            }
        }
    }
    
    /**
     * Log form data
     * Utility method to log the current form data
     * @public
     */
    logFormData() {
        if (!this.enabled) return;
        
        this.info('Current form data', this.formChippy.formData);
    }
    
    /**
     * Log slide change
     * @param {number} fromIndex - Previous slide index
     * @param {number} toIndex - New slide index
     * @public
     */
    logSlideChange(fromIndex, toIndex) {
        if (!this.enabled) return;
        
        const fromSlide = this.formChippy.slides[fromIndex];
        const toSlide = this.formChippy.slides[toIndex];
        
        this.info('Slide change', {
            from: {
                index: fromIndex,
                id: fromSlide ? fromSlide.getAttribute('data-fc-slide') : null
            },
            to: {
                index: toIndex,
                id: toSlide ? toSlide.getAttribute('data-fc-slide') : null
            }
        });
    }
    
    /**
     * Log validation result
     * @param {HTMLElement} input - The input element
     * @param {boolean} isValid - Whether the input is valid
     * @param {string} errorMessage - Error message if invalid
     * @public
     */
    logValidation(input, isValid, errorMessage = null) {
        if (!this.enabled) return;
        
        // Find the slide this input belongs to
        const slide = input.closest('[data-fc-slide]');
        const slideId = slide ? slide.getAttribute('data-fc-slide') : 'unknown';
        const slideIndex = this.formChippy.slides.indexOf(slide);
        
        // Get validation rules that were applied
        const validationRules = this._getValidationRules(input);
        
        const logLevel = isValid ? 'info' : 'warn';
        const message = isValid ? 
            `✓ Validation passed: ${input.name || input.id || 'unnamed input'}` : 
            `⚠️ Validation failed: ${input.name || input.id || 'unnamed input'}`;
        
        this._log(logLevel, message, {
            slide: {
                id: slideId,
                index: slideIndex,
                title: slide ? slide.querySelector('[data-fc-slide-title]')?.textContent : 'Unknown'
            },
            input: {
                name: input.name || input.id || 'unnamed input',
                type: input.type || input.tagName.toLowerCase(),
                value: input.value,
                required: input.required || false,
                validationRules
            },
            result: {
                isValid,
                errorMessage,
                timestamp: new Date().toISOString()
            },
            affectsNavigation: input.required || validationRules.length > 0
        });
        
        // Update UI if enabled
        if (this.logToUI && this.logContainer) {
            this._updateValidationUI(input, isValid, errorMessage);
        }
    }
    
    /**
     * Get validation rules that apply to an input
     * @param {HTMLElement} input - Input element
     * @returns {Array} Array of validation rule objects
     * @private
     */
    _getValidationRules(input) {
        const rules = [];
        
        if (input.required) {
            rules.push({ rule: 'required', message: 'This field is required' });
        }
        
        if (input.type === 'email') {
            rules.push({ rule: 'email', message: 'Must be a valid email address' });
        }
        
        if (input.type === 'number') {
            const min = input.getAttribute('min');
            const max = input.getAttribute('max');
            
            if (min !== null) {
                rules.push({ rule: 'min', value: min, message: `Minimum value is ${min}` });
            }
            
            if (max !== null) {
                rules.push({ rule: 'max', value: max, message: `Maximum value is ${max}` });
            }
        }
        
        // Pattern validation
        const pattern = input.getAttribute('pattern');
        if (pattern) {
            const errorMsg = input.getAttribute('data-error-message') || 'Please enter a valid value';
            rules.push({ rule: 'pattern', pattern, message: errorMsg });
        }
        
        // Min and max length
        const minLength = input.getAttribute('minlength');
        if (minLength !== null) {
            rules.push({ rule: 'minlength', value: minLength, message: `Minimum length is ${minLength} characters` });
        }
        
        const maxLength = input.getAttribute('maxlength');
        if (maxLength !== null) {
            rules.push({ rule: 'maxlength', value: maxLength, message: `Maximum length is ${maxLength} characters` });
        }
        
        return rules;
    }
    
    /**
     * Update the validation status in the UI
     * @param {HTMLElement} input - Input element
     * @param {boolean} isValid - Whether the input is valid
     * @param {string} errorMessage - Error message if invalid
     * @private
     */
    _updateValidationUI(input, isValid, errorMessage) {
        // Find or create validation section in debug UI
        let validationSection = this.logContainer.querySelector('.fc-debug-validation');
        
        if (!validationSection) {
            validationSection = document.createElement('div');
            validationSection.className = 'fc-debug-validation';
            validationSection.innerHTML = `
                <div class="fc-debug-validation-header">
                    <h4>Validation Status</h4>
                    <button class="fc-debug-validation-clear">Clear</button>
                </div>
                <div class="fc-debug-validation-content"></div>
            `;
            
            // Add clear button functionality
            const clearBtn = validationSection.querySelector('.fc-debug-validation-clear');
            clearBtn.addEventListener('click', () => {
                const content = validationSection.querySelector('.fc-debug-validation-content');
                content.innerHTML = '';
            });
            
            this.logContainer.appendChild(validationSection);
        }
        
        const validationContent = validationSection.querySelector('.fc-debug-validation-content');
        
        // Create or update validation entry for this input
        const inputId = input.name || input.id || Math.random().toString(36).substr(2, 9);
        let validationEntry = validationContent.querySelector(`[data-input-id="${inputId}"]`);
        
        if (!validationEntry) {
            validationEntry = document.createElement('div');
            validationEntry.className = 'fc-debug-validation-entry';
            validationEntry.dataset.inputId = inputId;
            validationContent.appendChild(validationEntry);
        }
        
        // Update entry content
        validationEntry.className = `fc-debug-validation-entry ${isValid ? 'fc-debug-validation-valid' : 'fc-debug-validation-invalid'}`;
        validationEntry.innerHTML = `
            <div class="fc-debug-validation-input">
                <span class="fc-debug-validation-name">${input.name || input.id || 'unnamed input'}</span>
                <span class="fc-debug-validation-type">${input.type || input.tagName.toLowerCase()}</span>
                <span class="fc-debug-validation-status ${isValid ? 'valid' : 'invalid'}">
                    ${isValid ? '✓' : '⚠️'}
                </span>
            </div>
            ${!isValid ? `<div class="fc-debug-validation-error">${errorMessage}</div>` : ''}
            <div class="fc-debug-validation-value">Value: "${input.value}"</div>
        `;
    }
    
    /**
     * Log form submission
     * @param {object} formData - The form data being submitted
     * @param {string} endpoint - The submission endpoint
     * @public
     */
    logSubmission(formData, endpoint) {
        if (!this.enabled) return;
        
        this.info('Form submission', {
            endpoint,
            formData
        });
    }
}
