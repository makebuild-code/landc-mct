/**
 * Validation.js
 * Handles form input validation
 * 
 * Form Validation Attributes:
 * - data-fc-required="false": Mark elements as not required (optional)
 *   Can be applied at multiple levels in hierarchy:
 *   - On slide: <div data-fc-slide="1" data-fc-required="false">...
 *   - On content: <div data-fc-content data-fc-required="false">...
 *   - On question: <div data-fc-question data-fc-required="false">...
 *   - On label: <label data-fc-required="false">...
 *   - On input: <input type="text" data-fc-required="false">
 *   - On radio: <input type="radio" name="group" data-fc-required="false">
 */

export class Validation {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize the form data object
        this.formData = {};
        
        // Set up input change listeners for all input types
        this.setupInputChangeListeners();
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
        
        // Check if this slide has any elements to validate
        const hasInputs = slide.querySelector(this.options.inputSelector) !== null;
        const hasFieldElements = slide.querySelector('[data-fc-element="field"]') !== null;
        const hasWebflowRadios = slide.querySelector('[data-fc-element="radio"], [data-fc-element="radio-input-field"]') !== null;
        const hasAnyRadios = hasWebflowRadios || slide.querySelector('input[type="radio"]') !== null;
        
        // Log detailed information about what elements exist on this slide
        this.formChippy.debug.info(`Slide ${slideId} validation inventory:`);
        this.formChippy.debug.info(`- Has standard inputs: ${hasInputs ? 'YES' : 'NO'}`);
        this.formChippy.debug.info(`- Has field elements: ${hasFieldElements ? 'YES' : 'NO'}`);
        this.formChippy.debug.info(`- Has Webflow radio elements: ${hasWebflowRadios ? 'YES' : 'NO'}`);
        this.formChippy.debug.info(`- Has any radio inputs: ${hasAnyRadios ? 'YES' : 'NO'}`);
        
        // If there's nothing to validate, slide is automatically valid
        if (!hasInputs && !hasFieldElements && !hasAnyRadios) {
            this.formChippy.debug.info(`Slide ${slideId} has NOTHING to validate - marking as automatically valid`);
            return true;
        }
        
        this.formChippy.debug.info(`Slide ${slideId} has elements to validate - proceeding with validation`);
        
        // Track validation state for each type of element
        let isInputsValid = true;
        let isFieldElementsValid = true;
        let isRadioGroupsValid = true;
        
        // Only validate if we have standard inputs
        if (hasInputs) {
            // Validate standard inputs
            const inputs = slide.querySelectorAll(this.options.inputSelector);
            inputs.forEach((input) => {
                if (!this.validateInput(input)) {
                    isInputsValid = false;
                }
            });
        }
        
        // Only validate if we have field elements
        if (hasFieldElements) {
            // Find and validate field elements (Webflow's nested input structure)
            const fieldElements = slide.querySelectorAll('[data-fc-element="field"]');
            fieldElements.forEach((fieldElement) => {
                // Find the actual input inside the field element
                const nestedInput = fieldElement.querySelector('input, textarea, select');
                // Only validate if we found a nested input
                if (nestedInput) {
                    if (!this.validateInput(nestedInput, fieldElement)) {
                        isFieldElementsValid = false;
                    }
                } else {
                    // Log debug info if no input was found in a field element
                    this.formChippy.debug.warn(`No input found in field element: ${fieldElement.outerHTML.substring(0, 100)}...`);
                }
            });
        }

        // Only validate radio groups if we have them
        if (hasAnyRadios) {
            isRadioGroupsValid = this.validateRadioGroup(slide);
            this.formChippy.debug.info(`Radio group validation result: ${isRadioGroupsValid ? 'Passed' : 'Failed'}`);
        }

        // Final slide validity depends on all elements that exist in the slide
        const overallValid = isInputsValid && isFieldElementsValid && isRadioGroupsValid;
        this.formChippy.debug.info(`Overall validation for slide ${slideId}: ${overallValid ? 'Passed' : 'Failed'}`);
        return overallValid;
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
     * Set up change event listeners for all input types to clear errors immediately when a value is entered
     * and to update the form data object
     */
    setupInputChangeListeners() {
        // Use event delegation on the container to catch all input changes
        const container = document.querySelector(this.options.containerSelector);
        if (!container) return;
        
        // Listen for input events (fires as the user types)
        container.addEventListener('input', (event) => {
            const input = event.target;
            
            // Handle all input types
            if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
                // Update the form data
                this.updateFormData(input);
                
                // Check for and clear any input errors
                if (input.classList.contains('fc-error') || input.classList.contains('error')) {
                    if (input.value.trim() !== '') {
                        // Clear the error specifically on this input
                        this.clearInputError(input);
                        
                        // Also clear parent content error if appropriate
                        const contentElement = input.closest('[data-fc-content]');
                        if (contentElement && contentElement.classList.contains('error')) {
                            contentElement.classList.remove('error');
                        }
                        
                        this.formChippy.debug.info('Input value entered, cleared error state');
                    }
                } else {
                    // Handle nested Webflow input structure
                    // Check if the input is inside a field element
                    const fieldElement = input.closest('[data-fc-element="field"]');
                    if (fieldElement && (fieldElement.classList.contains('fc-error') || fieldElement.classList.contains('error'))) {
                        if (input.value.trim() !== '') {
                            // Clear the error on the field element
                            this.clearInputError(fieldElement);
                            
                            // Also clear parent content error if appropriate
                            const contentElement = fieldElement.closest('[data-fc-content]');
                            if (contentElement && contentElement.classList.contains('error')) {
                                contentElement.classList.remove('error');
                            }
                            
                            this.formChippy.debug.info('Input value entered in field element, cleared error state');
                        }
                    }
                }
            }
        });
        
        // Listen for change events (fires when input loses focus or radio/checkbox clicked)
        container.addEventListener('change', (event) => {
            const input = event.target;
            
            // Special handling for radio buttons
            if (input.type === 'radio') {
                const group = input.closest('[data-fc-input-group]');
                if (group) {
                    // Update the form data
                    this.updateFormData(input);
                    
                    const contentElement = group.closest('[data-fc-content]');
                    if (contentElement && contentElement.classList.contains('error')) {
                        // Clear the error state
                        contentElement.classList.remove('error');
                        this.clearInputError(group);
                        this.formChippy.debug.info('Radio selection made, cleared error state');
                    }
                }
            }
            // Handle other change events for non-radio inputs
            else if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
                // Update the form data
                this.updateFormData(input);
            }
        });
    }
    
    /**
     * Update the form data object with the latest input value
     * @param {HTMLElement} input - The input element
     */
    updateFormData(input) {
        // Skip if no name attribute
        if (!input.name) return;
        
        let value;
        
        // Handle different input types
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'radio') {
            // Only update if checked
            if (input.checked) {
                value = input.value;
            } else {
                return; // Skip unchecked radio buttons
            }
        } else if (input.type === 'number' || input.getAttribute('data-type') === 'number') {
            // Convert to number if possible
            value = input.value !== '' ? Number(input.value) : '';
        } else {
            value = input.value;
        }
        
        // Structure the form data by slide
        const slide = input.closest('[data-fc-slide]');
        const slideId = slide ? slide.getAttribute('data-fc-slide') : 'unknown';
        
        if (!this.formData[slideId]) {
            this.formData[slideId] = {};
        }
        
        this.formData[slideId][input.name] = value;
        
        // Log the updated form data
        this.formChippy.debug.info(`Updated form data: ${input.name} = ${value}`);
        this.formChippy.debug.info(`Current form data:`, this.formData);
    }
    
    /**
     * Validate a single input element
     * @param {HTMLElement} input - The input to validate
     * @param {HTMLElement} [fieldElement] - Optional parent field element (for Webflow nested structure)
     * Toggle content element error class
     * @param {HTMLElement} element - The element to find the content parent for
     * @param {boolean} hasError - Whether to add or remove error class
     * @param {string} [message] - Optional error message to display
     */
    toggleContentError(element, hasError, message) {
        // Find the content element
        const contentElement = element.closest('[data-fc-content]');
        if (!contentElement) {
            this.formChippy.debug.warn('No content element found for error handling');
            return;
        }

        if (hasError) {
            // Add error class if not already present
            if (!contentElement.classList.contains('error')) {
                contentElement.classList.add('error');
                this.formChippy.debug.info(`Added error class to content element`);

                // Only add error message if there's no custom error element and a message was provided
                if (message && !contentElement.querySelector('[data-fc-content-error]')) {
                    // Add a custom error message to the content element
                    const errorElement = document.createElement('div');
                    errorElement.className = 'fc-error-message';
                    errorElement.textContent = message;
                    errorElement.style.color = 'var(--fc-error-color, var(--mct-error-color, #ff3860))';
                    errorElement.style.fontSize = '0.875rem';
                    
                    // Only append if no error message already exists
                    if (!contentElement.querySelector('.fc-error-message')) {
                        contentElement.appendChild(errorElement);
                        this.formChippy.debug.info(`Added error message to content element`);
                    }
                }
            }
        } else {
            // Remove error class if present
            if (contentElement.classList.contains('error')) {
                contentElement.classList.remove('error');
                this.formChippy.debug.info(`Removed error class from content element`);
                
                // Remove any error messages
                const errorElement = contentElement.querySelector('.fc-error-message');
                if (errorElement) {
                    errorElement.remove();
                    this.formChippy.debug.info(`Removed error message from content element`);
                }
            }
        }
    }

    /**
     * @returns {boolean} - True if valid, false otherwise
     */
    validateInput(input, fieldElement) {
        // Check if input exists and is a valid element
        if (!input || typeof input !== 'object') {
            console.warn('FormChippy: Invalid input element passed to validateInput');
            return false; // Return false to indicate validation failed
        }
        
        // Clear previous errors
        const elementToApplyError = fieldElement || input;
        this.clearInputError(elementToApplyError);
        
        // Safely check if input has a value property
        const inputValue = input.value !== undefined ? input.value : '';
        const trimmedValue = typeof inputValue === 'string' ? inputValue.trim() : '';
        
        // Check if input should be treated as optional by checking various parent elements
        // Check the input itself, its parent content element, slide, or associated label
        
        // Get parent elements
        const slide = input.closest('[data-fc-slide]');
        const contentElement = input.closest('[data-fc-content]');
        const fieldContainer = input.closest('[data-fc-question]');
        const label = fieldContainer?.querySelector('label');
        
        // Check hierarchical elements for required=false
        const isNotRequired = 
            input.getAttribute('data-fc-required') === 'false' || 
            (contentElement && contentElement.getAttribute('data-fc-required') === 'false') ||
            (slide && slide.getAttribute('data-fc-required') === 'false') ||
            (label && label.getAttribute('data-fc-required') === 'false');
        
        this.formChippy.debug.info(`Validating input ${input.name || input.id || 'unnamed'}: ${isNotRequired ? 'Optional' : 'Required'}`);
        
        if (isNotRequired && trimmedValue === '') {
            this.formChippy.debug.info(`Optional input is empty, skipping validation`);
            return true;
        }
        
        // Check if the input is empty
        if (trimmedValue === '') {
            this.formChippy.debug.info(`Required input is empty, validation failed`);
            this.showInputError(elementToApplyError, 'This field is required');
            
            // Also apply error class to the content element
            this.toggleContentError(input, true, 'This field is required');
            return false;
        }
        
        // All other validation is skipped per requirements
        return true;
    }

    /**
     * Validate radio button groups within a specific slide
     * @param {HTMLElement} slide - The slide containing the radio groups
     * @returns {boolean} - True if all radio groups are valid, false otherwise
     */
    validateRadioGroup(slide) {
        const slideId = slide.getAttribute('data-fc-slide');
        this.formChippy.debug.info(`Starting radio group validation for slide: ${slideId}`);
        
        // First check if there are any radio inputs in the slide
        const allRadioInputs = slide.querySelectorAll('input[type="radio"]');
        this.formChippy.debug.info(`Found ${allRadioInputs.length} radio inputs in slide ${slideId}`);
        
        // If there are no radio inputs, validation passes by default
        if (allRadioInputs.length === 0) {
            this.formChippy.debug.info('No radio inputs found, skipping radio validation');
            return true;
        }
        
        // Find all Webflow-style radio elements
        const radioElements = slide.querySelectorAll('[data-fc-element="radio"], [data-fc-element="radio-input-field"]');
        this.formChippy.debug.info(`Found ${radioElements.length} Webflow-style radio elements in slide ${slideId}`);
        
        // If there are no structured Webflow radio elements, check for any radio inputs directly
        if (radioElements.length === 0) {
            this.formChippy.debug.info(`No Webflow radio elements found, checking for any radio inputs`);
            // Check if there are any radio inputs at all
            const allLooseRadios = slide.querySelectorAll('input[type="radio"]');
            this.formChippy.debug.info(`Found ${allLooseRadios.length} radio inputs not in Webflow structure`);
            
            if (allLooseRadios.length === 0) {
                this.formChippy.debug.info('No radio inputs found at all, skipping radio validation');
                return true;
            }
            
            // For loose radio inputs, group them by name attribute
            const radiosByName = {};
            
            Array.from(allLooseRadios).forEach(radio => {
                if (radio.name) {
                    if (!radiosByName[radio.name]) {
                        radiosByName[radio.name] = [];
                    }
                    radiosByName[radio.name].push(radio);
                }
            });
            
            this.formChippy.debug.info(`Grouped loose radio inputs by name, found ${Object.keys(radiosByName).length} groups`);
            
            // If no named groups were found, there's nothing to validate
            if (Object.keys(radiosByName).length === 0) {
                this.formChippy.debug.info('No named radio groups found, skipping validation');
                return true;
            }
            
            let allGroupsValid = true;
            
            // Process each radio group by name
            Object.keys(radiosByName).forEach((groupName, index) => {
                this.formChippy.debug.info(`Validating radio group: '${groupName}' (${index + 1}/${Object.keys(radiosByName).length})`);
                
                const radiosInGroup = radiosByName[groupName];
                this.formChippy.debug.info(`Group '${groupName}' has ${radiosInGroup.length} radio buttons`);
                
                // Get relevant parent elements for the first radio in the group
                const radioElement = radiosInGroup[0]; 
                const radioSlide = radioElement.closest('[data-fc-slide]');
                const radioContentElement = radioElement.closest('[data-fc-content]');
                const radioFieldContainer = radioElement.closest('[data-fc-question]');
                const radioLabel = radioFieldContainer?.querySelector('label');
                
                // Check hierarchical elements for required=false
                const isNotRequired = 
                    // Check if any radio in the group has the required=false attribute
                    radiosInGroup.some(radio => radio.getAttribute('data-fc-required') === 'false') || 
                    // Check parent elements
                    (radioContentElement && radioContentElement.getAttribute('data-fc-required') === 'false') ||
                    (radioSlide && radioSlide.getAttribute('data-fc-required') === 'false') ||
                    (radioLabel && radioLabel.getAttribute('data-fc-required') === 'false');
                    
                this.formChippy.debug.info(`Group '${groupName}' status: ${isNotRequired ? 'Optional' : 'Required'}`);
                
                // Skip validation for optional groups
                if (isNotRequired) {
                    this.formChippy.debug.info(`Skipping validation for optional group '${groupName}'`);
                    return; // Continue to next group
                }
                
                // Check if any radio in the group is checked
                const isChecked = radiosInGroup.some(radio => radio.checked);
                this.formChippy.debug.info(`Group '${groupName}' has a selected option: ${isChecked ? 'Yes' : 'No'}`);
                
                // The radioElement variable is already defined above (was previously named firstRadio)
                // Find the parent content element for error display
                const radioParent = radioElement.closest('[data-fc-question]') || radioElement.closest('[data-fc-content]');
                const displayContentElement = radioParent ? (radioParent.closest('[data-fc-content]') || radioParent) : null;
                this.formChippy.debug.info(`Found content element for group '${groupName}': ${displayContentElement ? 'Yes' : 'No'}`);

                if (!isChecked) {
                    // Use the unified error handling for content element
                    this.toggleContentError(radioElement, true, 'Please select an option');
                    allGroupsValid = false; // Mark as invalid if any group fails
                } else {
                    // Use the unified error handling to clear error
                    this.toggleContentError(radioElement, false);
                }
            });
            
            this.formChippy.debug.info(`Radio group validation for slide ${slide.getAttribute('data-fc-slide')}: ${allGroupsValid ? 'Passed' : 'Failed'}`);
            return allGroupsValid;
        }
        
        // Process Webflow-style radio groups by name attribute
        this.formChippy.debug.info(`Processing Webflow-style radio groups for slide ${slideId}`);
        
        // First, collect all radio inputs by their name to handle them as groups
        const radiosByName = {};
        
        // Find all radio inputs within the radio elements
        radioElements.forEach((radioElement, index) => {
            this.formChippy.debug.info(`Processing radio element ${index + 1}/${radioElements.length}`);
            
            const radioInput = radioElement.querySelector('input[type="radio"]');
            if (radioInput && radioInput.name) {
                const radioName = radioInput.name;
                this.formChippy.debug.info(`Found radio input with name: ${radioName}`);
                
                if (!radiosByName[radioName]) {
                    radiosByName[radioName] = [];
                    this.formChippy.debug.info(`Created new group for '${radioName}'`);
                }
                
                radiosByName[radioName].push(radioInput);
                this.formChippy.debug.info(`Added radio to group '${radioName}', now has ${radiosByName[radioName].length} radios`);
            } else {
                this.formChippy.debug.warn(`Radio element ${index + 1} has no valid input or name attribute`);
            }
        });
        
        this.formChippy.debug.info(`Found ${Object.keys(radiosByName).length} radio groups by name: ${Object.keys(radiosByName).join(', ')}`);
        
        let allGroupsValid = true;
        
        // Process each radio group by name
        Object.keys(radiosByName).forEach(groupName => {
            this.formChippy.debug.info(`Validating radio group: '${groupName}'`);
            
            const radiosInGroup = radiosByName[groupName];
            this.formChippy.debug.info(`Group '${groupName}' has ${radiosInGroup.length} radio buttons`);
            
            // Get the first radio in the group to check parent elements
            const groupRadioEl = radiosInGroup[0];
            const radioGroupSlide = groupRadioEl.closest('[data-fc-slide]');
            const radioGroupContent = groupRadioEl.closest('[data-fc-content]');
            const radioGroupContainer = groupRadioEl.closest('[data-fc-question]');
            const radioGroupLabel = radioGroupContainer?.querySelector('label');
            
            // Check hierarchical elements for required=false
            const isGroupNotRequired = 
                // Check if any radio in the group has required=false attribute
                radiosInGroup.some(radio => radio.getAttribute('data-fc-required') === 'false') || 
                // Check parent elements
                (radioGroupContent && radioGroupContent.getAttribute('data-fc-required') === 'false') ||
                (radioGroupSlide && radioGroupSlide.getAttribute('data-fc-required') === 'false') ||
                (radioGroupLabel && radioGroupLabel.getAttribute('data-fc-required') === 'false');
            
            this.formChippy.debug.info(`Group '${groupName}' status: ${isGroupNotRequired ? 'Optional' : 'Required'}`);
            
            // Skip validation for optional groups
            if (isGroupNotRequired) {
                this.formChippy.debug.info(`Skipping validation for optional group '${groupName}'`);
                return; // Continue to next group
            }
            
            // Check if any radio in the group is checked
            const isChecked = radiosInGroup.some(radio => radio.checked);
            this.formChippy.debug.info(`Group '${groupName}' has a selected option: ${isChecked ? 'Yes' : 'No'}`);
            
            // Log which option is selected if any
            if (isChecked) {
                const selectedOption = radiosInGroup.find(radio => radio.checked);
                if (selectedOption) {
                    this.formChippy.debug.info(`Selected option in group '${groupName}': ${selectedOption.value || 'No value'}`);
                }
            }
            
            // Find the parent content element for error display
            // First check if all radios share a common parent with data-fc-input-group
            let contentElement = null;
            const firstRadio = radiosInGroup[0];
            
            this.formChippy.debug.info(`Finding parent content element for group '${groupName}'`);
            
            const radioParent = firstRadio.closest('[data-fc-question]') || 
                               firstRadio.closest('[data-fc-content]');
            
            if (radioParent) {
                contentElement = radioParent.closest('[data-fc-content]') || radioParent;
                this.formChippy.debug.info(`Found parent element for group '${groupName}': ${contentElement ? contentElement.tagName : 'None'}`);
            } else {
                this.formChippy.debug.warn(`No parent element found for group '${groupName}'`);
            }
            
            if (!isChecked) {
                this.formChippy.debug.info(`Group '${groupName}' validation failed - no option selected`);
                
                // Use the unified error handling function with group-specific message
                this.toggleContentError(groupRadioEl, true, `Please select an option for ${groupName}`);
                
                allGroupsValid = false; // Mark as invalid if any group fails
                this.formChippy.debug.info(`Marking validation as failed for group '${groupName}'`);
            } else {
                this.formChippy.debug.info(`Group '${groupName}' validation passed - option selected`);
                
                // Use the unified error handling function to clear errors
                this.toggleContentError(groupRadioEl, false);
                
                this.formChippy.debug.info(`Cleared any error state for group '${groupName}'`);
            }
        });
        
        this.formChippy.debug.info(`Radio group validation for slide ${slide.getAttribute('data-fc-slide')}: ${allGroupsValid ? 'Passed' : 'Failed'}`);
        return allGroupsValid;
    }

    /**
     * Show input error
     * @param {HTMLElement} input - Input element
     * @param {string} message - Error message
     */
    showInputError(input, message) {
        // Log validation error
        this.formChippy.debug.logValidation(input, false, message);
        
        // Check if input is empty and add empty class if needed (only for standard inputs)
        if (input.matches('input, textarea, select')) {
            if (input.value.trim() === '') {
                input.classList.add('fc-empty', 'empty');
            } else {
                input.classList.remove('fc-empty', 'empty');
            }
        }
        
        // Handle group elements differently if needed
        if (!input.matches('input, textarea, select')) { // Check if it's not a standard input
            // Apply error styling/class to the group container itself or a specific child
            input.classList.add('fc-error', 'error'); // Add error class to the group
        } else {
            input.style.borderColor = 'var(--fc-error-color, var(--mct-error-color, #ff3860))';
            input.classList.add('fc-error', 'error');
        }

        // Find question container
        const questionContainer = 
            input.closest('[data-fc-question]') || input.closest('[data-fc-content]') || input.parentNode;
        
        // Add error class to the question container
        questionContainer.classList.add('fc-has-error', 'has-error');
        
        // Content element error handling is now done by toggleContentError() method
        
        // Only create error message if there's no custom error element
        if (!questionContainer.querySelector('[data-fc-content-error]')) {
            // Create error message
            let errorElement = questionContainer.querySelector('.fc-error-message');
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
        }

        // Focus the input only for standard inputs
        if (input.matches('input, textarea, select')) {
            input.focus();
        }
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
        
        // Handle group elements
        if (!input.matches('input, textarea, select')) {
            input.classList.remove('fc-error', 'error'); // Remove error class from the group
        } else {
            input.style.borderColor = '';
            input.classList.remove('fc-error', 'error');
        }

        // Check if input is empty and update empty class accordingly (only for standard inputs)
        if (input.matches('input, textarea, select')) {
            if (input.value.trim() === '') {
                input.classList.add('fc-empty', 'empty');
            } else {
                input.classList.remove('fc-empty', 'empty');
            }
        }

        // Find question container
        const questionContainer =
            input.closest('[data-fc-question]') || input.closest('[data-fc-content]') || input.parentNode;
            
        // Remove error class from question container
        questionContainer.classList.remove('fc-has-error', 'has-error');
        
        // Content element error handling is now done by toggleContentError() method
        
        // Remove error message
        const errorElement =
            questionContainer.querySelector('.fc-error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    /**
     * Get the whole form data as a JSON object, organized by slide ID
     * @returns {Object} Form data organized by slide ID
     */
    getFormData() {
        return this.formData;
    }
    
    /**
     * Get flattened form data (all slides combined in one object)
     * @returns {Object} Flattened form data
     */
    getFlatFormData() {
        const flatData = {};
        
        // Flatten the slide-based structure into a single object
        for (const slideId in this.formData) {
            for (const fieldName in this.formData[slideId]) {
                flatData[fieldName] = this.formData[slideId][fieldName];
            }
        }
        
        return flatData;
    }
}
