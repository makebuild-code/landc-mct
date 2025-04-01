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
    /**
     * @param {FormChippy} formChippy - The main FormChippy instance
     */
    constructor(formChippy) {
        this.formChippy = formChippy
        this.options = formChippy.options

        // Initialize the form data object
        this.formData = {}

        // Set up input change listeners for all input types
        this.setupInputChangeListeners()
    }

    /**
     * Validate a slide's inputs
     * @param {HTMLElement} slide - The slide to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateSlide(slide) {
        this.formChippy.debug.info(`[validateSlide] Starting validation for slide: ${slide.getAttribute('data-fc-slide') || 'Unnamed Slide'}`)
        let isSlideValid = true
        let firstErrorInput = null

        const slideId = slide.getAttribute('data-fc-slide')

        if (!this.formChippy.validationEnabled) {
            this.formChippy.debug.info(
                `Validation skipped (disabled) for slide: ${slideId}`
            )
            return true
        }

        this.formChippy.debug.info(`Validating slide: ${slideId}`)

        // --- Step 1: Validate Radio Groups First ---
        // Radio groups have special logic, including conditional validation of nested inputs.
        // Handle them first to ensure their state is correct before general input validation.
        let isRadioGroupsValid = true
        const hasAnyRadios = slide.querySelector('input[type="radio"]') !== null
        if (hasAnyRadios) {
            isRadioGroupsValid = this.validateRadioGroup(slide) // This function now handles inputs within selected radiofields
            this.formChippy.debug.info(
                `Radio group validation result for slide ${slideId}: ${
                    isRadioGroupsValid ? 'Passed' : 'Failed'
                }`
            )
        } else {
            this.formChippy.debug.info(
                `Slide ${slideId} has NO radio buttons to validate.`
            )
        }

        // --- Step 2: Validate Other Inputs ---
        // Select all standard inputs (input, textarea, select) that are:
        // 1. Not radio buttons (handled above).
        // 2. Not inside a [data-fc-element="radiofield"] wrapper (handled by validateRadioGroup).
        let isOtherInputsValid = true
        const otherInputsSelector =
            'input:not([type="radio"]), textarea, select'
        const allPotentialInputs = slide.querySelectorAll(otherInputsSelector)
        const inputsToValidate = Array.from(allPotentialInputs).filter(
            (input) => !input.closest('[data-fc-element="radiofield"]') // Exclude inputs inside radiofields
        )

        this.formChippy.debug.info(
            `Slide ${slideId} has ${inputsToValidate.length} other inputs to validate.`
        )

        if (inputsToValidate.length > 0) {
            inputsToValidate.forEach((input) => {
                // Determine the correct context element for error messages (might be a wrapper)
                const fieldElement = input.closest('[data-fc-element="field"]') // Check if it's inside a Webflow-style field
                const contextElement = fieldElement || input // Use field wrapper if available, otherwise the input itself

                this.formChippy.debug.info(
                    `Validating other input: ${
                        input.name || input.id || 'unnamed'
                    } (Context: ${contextElement.tagName})`
                )

                if (!this.validateInput(input, contextElement)) {
                    // Pass context for error placement
                    isOtherInputsValid = false
                    this.formChippy.debug.warn(
                        `Validation failed for other input: ${
                            input.name || input.id || 'unnamed'
                        }`
                    )
                }
            })
            this.formChippy.debug.info(
                `Other input validation result for slide ${slideId}: ${
                    isOtherInputsValid ? 'Passed' : 'Failed'
                }`
            )
        } else {
            this.formChippy.debug.info(
                `Slide ${slideId} has NO other inputs to validate.`
            )
        }

        // --- Step 3: Determine Overall Slide Validity ---
        const overallValid = isRadioGroupsValid && isOtherInputsValid

        // Check if there was anything to validate at all
        const hasAnythingToValidate =
            hasAnyRadios || inputsToValidate.length > 0
        if (!hasAnythingToValidate) {
            this.formChippy.debug.info(
                `Slide ${slideId} has NOTHING to validate - marking as automatically valid (overriding initial checks).`
            )
            return true // If no radios AND no other inputs, it's valid.
        }

        this.formChippy.debug.info(
            `Overall validation for slide ${slideId}: ${
                overallValid ? 'Passed' : 'Failed'
            }`
        )
        this.formChippy.debug.info(`[validateSlide] Completed. Slide valid: ${overallValid}`)
        return overallValid
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateEmail(email) {
        const re =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return re.test(String(email).toLowerCase())
    }

    /**
     * Set up change event listeners for all input types to clear errors immediately when a value is entered
     * and to update the form data object
     */
    setupInputChangeListeners() {
        // Use event delegation on the container to catch all input changes
        const container = document.querySelector(this.options.containerSelector)
        if (!container) return

        // Listen for input events (fires as the user types)
        container.addEventListener('input', (event) => {
            const input = event.target

            // Handle standard input types immediately for visual error clearing
            if (
                input.tagName === 'INPUT' && input.type !== 'radio' && input.type !== 'checkbox' ||
                input.tagName === 'TEXTAREA' ||
                input.tagName === 'SELECT'
            ) {
                // Log the input value immediately when the event fires
                this.formChippy.debug.info(`[Input Event] Input on '${input.name || input.type}'. Value: '${input.value}'`);

                // 1. Update the form data
                this.updateFormData(input)

                // 2. Re-validate the entire slide immediately
                const slideElement = input.closest('[data-fc-slide]')
                if (slideElement) {
                    const isValid = this.validateSlide(slideElement) // This will trigger detailed logs inside validateSlide
                    this.formChippy.debug.info(`[Input Event] Result of validateSlide after input: ${isValid ? 'Valid' : 'Invalid'}`)
                } else {
                    this.formChippy.debug.warn(`[Input Event] Could not find parent slide for input: ${input.name || input.id}`)
                }
            }
        })

        // Listen for change events (fires when input loses focus or radio/checkbox clicked)
        container.addEventListener('change', (event) => {
            const input = event.target

            // Special handling for radio buttons
            if (input.type === 'radio') {
                // 1. Update form data for the radio button itself (only if checked)
                this.updateFormData(input)

                // --- Update Associated Inputs in RadioFields ---
                // When a radio changes, we must explicitly update the data state
                // for ALL inputs within ANY radiofield belonging to this group.
                const groupName = input.name
                const slideElement = input.closest('[data-fc-slide]')
                if (slideElement && groupName) {
                    const radiosInGroup = slideElement.querySelectorAll(
                        `input[type="radio"][name="${groupName}"]`
                    )
                    radiosInGroup.forEach((radioInGroup) => {
                        const radioFieldWrapper = radioInGroup.closest(
                            '[data-fc-element="radiofield"]'
                        )
                        if (radioFieldWrapper) {
                            const associatedInputs =
                                radioFieldWrapper.querySelectorAll(
                                    'input:not([type="radio"]), textarea, select'
                                )
                            associatedInputs.forEach((associatedInput) => {
                                this.formChippy.debug.info(
                                    `Triggering updateFormData for associated input '${associatedInput.name || associatedInput.dataset.fcInput}' due to radio '${groupName}' change.`
                                )
                                this.updateFormData(associatedInput) // This will check the radio's state
                            })
                        }
                    })
                } else {
                    this.formChippy.debug.warn(
                        `Could not find slide or group name to update associated radiofield inputs for:`,
                        input
                    )
                }
                // ---------------------------------------------

                // 2. Update form data for inputs within the *related* radiofields
                if (input.checked && input.name) {
                    // Find all radios in the same group within this slide
                    const groupName = input.name
                    const radiosInGroup = slideElement.querySelectorAll(
                        `input[type="radio"][name="${groupName}"]`
                    )

                    this.formChippy.debug.info(
                        `Radio '${input.value}' changed. Updating related radiofield inputs for group '${groupName}'.`
                    )

                    radiosInGroup.forEach((radioInGroup) => {
                        const radioFieldWrapper = radioInGroup.closest(
                            '[data-fc-element="radiofield"]'
                        )
                        if (radioFieldWrapper) {
                            const associatedInputs =
                                radioFieldWrapper.querySelectorAll(
                                    'input:not([type="radio"]), textarea, select'
                                )
                            associatedInputs.forEach((associatedInput) => {
                                // Call updateFormData for the associated input.
                                // This will add/update its value if its radio is checked,
                                // or remove it if its radio is now unchecked.
                                this.formChippy.debug.info(
                                    `  - Triggering updateFormData for associated input '${
                                        associatedInput.name || 'unnamed'
                                    }' (parent radio: '${radioInGroup.value}')`
                                )
                                this.updateFormData(associatedInput)
                            })
                        }
                    })
                }

                // 3. Immediately clear errors and revalidate when a radio is selected
                if (input.checked) {
                    // Find all related elements
                    const group = input.closest('[data-fc-input-group]')
                    const contentElement = input.closest('[data-fc-content]')
                    const slide = input.closest('[data-fc-slide]')

                    // Always clear any error states when a radio is selected
                    if (group) {
                        this.clearInputError(group) // Clear error on the group element
                    }

                    // Explicitly clear content element errors
                    if (contentElement) {
                        contentElement.classList.remove(this.options.errorClass, 'error')
                        // Remove any error message elements
                        const errorMessages = contentElement.querySelectorAll('.fc-error-message')
                        errorMessages.forEach(el => el.remove())
                        this.formChippy.debug.info(`Radio '${input.value}' selected - cleared content errors for group '${input.name}'`)
                    }

                    // Revalidate the slide to ensure validation state is updated
                    if (slide) {
                        const isValid = this.validateSlide(slide)
                        this.formChippy.debug.info(`Radio '${input.value}' selected - slide validation result: ${isValid ? 'Valid' : 'Invalid'}`)
                    }
                }
            }
            // Handle change events for non-radio inputs
            else if (
                input.tagName === 'INPUT' ||
                input.tagName === 'TEXTAREA' ||
                input.tagName === 'SELECT'
            ) {
                // 1. Update the form data (includes logic for inputs inside radiofields)
                this.updateFormData(input)

                // 2. Re-validate the input to give immediate feedback
                //    Especially important for inputs inside *selected* radiofields.
                const radioFieldWrapper = input.closest(
                    '[data-fc-element="radiofield"]'
                )
                if (radioFieldWrapper) {
                    const associatedRadio = radioFieldWrapper.querySelector(
                        'input[type="radio"]'
                    )
                    // Only re-validate if the associated radio is actually checked
                    if (associatedRadio && associatedRadio.checked) {
                        this.formChippy.debug.info(
                            `Re-validating input '${
                                input.getAttribute('data-input') || input.name
                            }' in selected radiofield on change.`
                        )
                        // Determine context for error message placement
                        const fieldElement = input.closest(
                            '[data-fc-element="field"]'
                        ) // Check if it's inside a Webflow-style field
                        const contextElement = fieldElement || input // Use field wrapper if available, otherwise the input itself
                        this.validateInput(input, contextElement) // Call validation
                    } else {
                        this.formChippy.debug.info(
                            `Input '${
                                input.getAttribute('data-input') || input.name
                            }' changed in a NON-selected radiofield, skipping immediate re-validation.`
                        )
                    }
                } else {
                    // For regular inputs not in radiofields, re-validate on change too
                    this.formChippy.debug.info(
                        `Re-validating standard input '${
                            input.getAttribute('data-input') || input.name
                        }' on change.`
                    )
                    const fieldElement = input.closest(
                        '[data-fc-element="field"]'
                    )
                    const contextElement = fieldElement || input
                    this.validateInput(input, contextElement)
                }
            }
        })
    }

    /**
     * Update the form data object with the latest input value
     * Handles radio group updates (using group name as key).
     * Handles radiofield updates (storing associated input data only if radio is checked).
     * Handles checkbox groups (storing values in an array).
     * Handles file inputs, number inputs, and default text inputs.
     * Cleans up orphaned keys if radio `data-fc-input` was used inconsistently.
     * @param {HTMLElement} input - The input element
     */
    updateFormData(input) {
        // Determine the key to use for form data: prioritize data-input, fallback to name
        const dataKey = input.getAttribute('data-input') || input.name

        // Skip if no key found or if the input is disabled
        if (!dataKey || input.disabled) {
            // Optionally log why it's skipped
            // if (!dataKey) this.formChippy.debug.warn('Input skipped: No data-input or name attribute found.', input);
            // if (input.disabled) this.formChippy.debug.info('Input skipped: Disabled.', input);
            return
        }

        const slide = input.closest('[data-fc-slide]')
        const slideId = slide ? slide.getAttribute('data-fc-slide') : 'unknown'

        // Ensure slide object exists
        if (!this.formData[slideId]) {
            this.formData[slideId] = {}
        }

        let value
        let shouldUpdate = true // Flag to control if the update proceeds

        // --- Radio Button Handling ---
        if (input.type === 'radio') {
            if (input.checked) {
                // For radio inputs, store the value directly to prevent nesting issues
                // If slideId and input.name are the same, we need to handle this differently
                if (slideId === input.name) {
                    // Store directly in the slide object to avoid nesting
                    this.formData[slideId] = input.value
                    this.formChippy.debug.info(
                        `Updated radio value for slide '${slideId}': ${input.value}`
                    )
                } else {
                    // Normal case - different slide ID and input name
                    this.formData[slideId][input.name] = input.value
                    this.formChippy.debug.info(
                        `Updated radio group '${input.name}': ${input.value}`
                    )
                }

                // Cleanup potentially orphaned keys if data-fc-input was used inconsistently
                const slideElement = input.closest('[data-fc-slide]')
                if (slideElement) {
                    const radiosInGroup = slideElement.querySelectorAll(
                        `input[type="radio"][name="${input.name}"]`
                    )
                    radiosInGroup.forEach((radioInGroup) => {
                        if (radioInGroup !== input) { // Only check *other* radios
                            const otherDataKey = radioInGroup.dataset.fcInput
                            // If another radio used data-fc-input and it's different from the groupName,
                            // and that key exists in formData, remove it.
                            if (
                                otherDataKey &&
                                otherDataKey !== input.name &&
                                this.formData[slideId] &&
                                this.formData[slideId].hasOwnProperty(otherDataKey)
                            ) {
                                delete this.formData[slideId][otherDataKey]
                                this.formChippy.debug.info(
                                    `Cleaned up orphaned radio key '${otherDataKey}' from group '${input.name}'`
                                )
                            }
                        }
                    })
                } else {
                    this.formChippy.debug.warn(
                        `Could not find slide element for radio group cleanup:`,
                        input
                    )
                }

                shouldUpdate = false // Handled radio specifically
            } else {
                // If an unchecked radio event occurs (less common), do nothing.
                // The corresponding checked radio's event will set the correct value.
                return
            }
        }
        // --- End Radio Button Handling ---

        // --- Radio Field Input Handling (Inputs *inside* radio labels) ---
        // Check if the input is inside a radio field wrapper
        const radioFieldWrapper = input.closest('[data-fc-element="radiofield"]')
        if (input.type !== 'radio' && radioFieldWrapper) {
            // Find the associated radio button within the wrapper
            const associatedRadio = radioFieldWrapper.querySelector(
                'input[type="radio"]'
            )

            if (associatedRadio && !associatedRadio.checked) {
                // Radio NOT checked: remove this input's data if it exists
                if (
                    this.formData[slideId] &&
                    this.formData[slideId].hasOwnProperty(dataKey)
                ) {
                    delete this.formData[slideId][dataKey]
                    this.formChippy.debug.info(
                        `Removed form data for input key '${dataKey}' in unselected radiofield.`
                    )
                } else {
                    // It might already be absent, which is fine
                    this.formChippy.debug.info(
                        `Input key '${dataKey}' in unselected radiofield was not present in formData, nothing to remove.`
                    )
                }
                // Log after potential deletion
                this.formChippy.debug.info(
                    `Current formData after potential removal:`,
                    this.formData
                )
                shouldUpdate = false // Do not proceed with adding/updating this value
            } else if (associatedRadio && associatedRadio.checked) {
                // Radio IS checked: Allow this input's data to be stored.
                // shouldUpdate remains true, so the standard update logic below will handle it.
                this.formChippy.debug.info(
                    `Input key '${dataKey}' is in a SELECTED radiofield. Allowing its value to be processed.`
                )
            } else if (!associatedRadio) {
                this.formChippy.debug.warn(
                    `Input with key '${dataKey}' is in a radiofield wrapper but no associated radio was found.`
                )
                // Decide how to handle this - maybe treat as normal input?
                // For now, let shouldUpdate remain true, allowing default handling.
            } else {
                // Default case if radio exists but state is indeterminate? Assume treat as normal.
                this.formChippy.debug.info(
                    `Input key '${dataKey}' in radiofield, associated radio state unclear or not found, proceeding with default update.`
                )
            }
        }
        // --- End Radio Field Input Handling ---

        // --- Standard Update Logic --- (Only runs if shouldUpdate is still true)
        if (shouldUpdate) {
            // Checkboxes (Groups)
            if (input.type === 'checkbox') {
                const groupKey = dataKey // Use dataKey derived earlier (data-fc-input or name)
                // Initialize the group array if it doesn't exist
                if (!this.formData[slideId][groupKey]) {
                    this.formData[slideId][groupKey] = []
                }

                if (input.checked) {
                    // Add value to the array if not already present
                    if (!this.formData[slideId][groupKey].includes(value)) {
                        this.formData[slideId][groupKey].push(value)
                    }
                } else {
                    // Remove value from the array
                    this.formData[slideId][groupKey] = this.formData[slideId][
                        groupKey
                    ].filter((item) => item !== value)
                }
                // If array is empty after removal, consider deleting the key?
                // if (this.formData[slideId][groupKey].length === 0) {
                //     delete this.formData[slideId][groupKey];
                // }
                this.formChippy.debug.info(
                    `Updated checkbox group '${groupKey}': ${JSON.stringify(
                        this.formData[slideId][groupKey]
                    )}`
                )
            } else if (
                input.type === 'number' ||
                input.getAttribute('data-input-type') === 'currency'
            ) {
                // Check data-input-type too
                value = input.value !== '' ? Number(input.value) : '' // Keep empty strings for empty required numbers
                this.formData[slideId][dataKey] = value
                this.formChippy.debug.info(
                    `Updated number/currency input '${dataKey}': ${value}`
                )
            } else if (input.type === 'file') {
                value = input.files // Store FileList object
                this.formData[slideId][dataKey] = value
                this.formChippy.debug.info(
                    `Updated file input '${dataKey}': ${input.files.length} file(s) selected`
                )
            } else {
                // Default for text, textarea, select, etc.
                value = input.value
                this.formData[slideId][dataKey] = value
                this.formChippy.debug.info(`Updated input '${dataKey}': ${value}`)
            }
        }
        // --- End Standard Update Logic ---

        // Log the complete, updated form data object AFTER every update attempt, regardless of whether standard update ran
        this.formChippy.debug.info(`Current formData:`, this.formData)
        
        // Save form data to localStorage using the persistence module
        if (this.formChippy.persistence) {
            // Make sure we have the correct form name from the data-fc-container attribute
            const formName = this.formChippy.formName || this.formChippy.name;
            this.formChippy.persistence.saveFormData(formName, this.formData);
            this.formChippy.debug.info(`Form data saved to localStorage for form ${formName}`);
            
            // Trigger a custom event that can be listened to by the example HTML
            if (typeof document !== 'undefined') {
                const event = new CustomEvent('formchippy:dataSaved', {
                    detail: {
                        formName: formName,
                        formData: this.formData
                    },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        }
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
        this.formChippy.debug.info(`[toggleContentError] Called for element near content: ${element.closest('[data-fc-content]').tagName || 'Not found'}. HasError: ${hasError}`)
        // Find the content element
        const contentElement = element.closest('[data-fc-content]')
        if (!contentElement) {
            this.formChippy.debug.warn(
                '[toggleContentError] Could not find parent [data-fc-content] element.'
            )
            return
        }

        if (hasError) {
            // Add error class if not already present
            if (!contentElement.classList.contains('error')) {
                contentElement.classList.add('error')
                this.formChippy.debug.info(
                    `[toggleContentError] Added error class to content element`
                )

                // Only add error message if there's no custom error element and a message was provided
                if (
                    message &&
                    !contentElement.querySelector('[data-fc-content-error]')
                ) {
                    // Add a custom error message to the content element
                    const errorElement = document.createElement('div')
                    errorElement.className = 'fc-error-message'
                    errorElement.textContent = message
                    errorElement.style.color =
                        'var(--fc-error-color, var(--mct-error-color, #ff3860))'
                    errorElement.style.fontSize = '0.875rem'

                    // Only append if no error message already exists
                    if (!contentElement.querySelector('.fc-error-message')) {
                        contentElement.appendChild(errorElement)
                        this.formChippy.debug.info(
                            `[toggleContentError] Added error message to content element`
                        )
                    }
                }
            }
        } else {
            // Remove error class if present
            if (contentElement.classList.contains('error')) {
                contentElement.classList.remove('error')
                this.formChippy.debug.info(
                    `[toggleContentError] Removed error class from content element`
                )

                // Remove any error messages
                const errorElement =
                    contentElement.querySelector('.fc-error-message')
                if (errorElement) {
                    errorElement.remove()
                    this.formChippy.debug.info(
                        `[toggleContentError] Removed error message from content element`
                    )
                }
            }
        }
    }

    /**
     * @returns {boolean} - True if valid, false otherwise
     */
    validateInput(input, fieldElement) {
        this.formChippy.debug.info(`[validateInput] Validating input: ${input.name || input.id || input.type}, FieldElement: ${fieldElement?.tagName || 'None'}`)
        // Check if input exists and is a valid element
        if (!input || typeof input !== 'object') {
            console.warn(
                'FormChippy: Invalid input element passed to validateInput'
            )
            return false // Return false to indicate validation failed
        }

        // Clear previous errors
        const elementToApplyError = fieldElement || input
        this.clearInputError(elementToApplyError)

        // Safely check if input has a value property
        const inputValue = input.value !== undefined ? input.value : ''
        const trimmedValue =
            typeof inputValue === 'string' ? inputValue.trim() : ''

        // Check if input should be treated as optional by checking various parent elements
        // Check the input itself, its parent content element, slide, or associated label

        // Get parent elements
        const slide = input.closest('[data-fc-slide]')
        const contentElement = input.closest('[data-fc-content]')
        const fieldContainer = input.closest('[data-fc-question]')
        const label = fieldContainer?.querySelector('label')

        // Check hierarchical elements for required=false
        const isNotRequired =
            input.getAttribute('data-fc-required') === 'false' ||
            (contentElement &&
                contentElement.getAttribute('data-fc-required') === 'false') ||
            (slide && slide.getAttribute('data-fc-required') === 'false') ||
            (label && label.getAttribute('data-fc-required') === 'false')

        this.formChippy.debug.info(
            `Validating input ${input.name || input.id || 'unnamed'}: ${
                isNotRequired ? 'Optional' : 'Required'
            }`
        )

        if (isNotRequired && trimmedValue === '') {
            this.formChippy.debug.info(
                `Optional input is empty, skipping validation`
            )
            return true
        }

        // Check if the input is empty
        if (trimmedValue === '') {
            this.formChippy.debug.info(
                `[validateInput] Required input is empty, validation FAILED`
            )
            this.showInputError(elementToApplyError, 'This field is required')

            // Also apply error class to the content element
            this.toggleContentError(input, true, 'This field is required')
            return false
        }

        this.formChippy.debug.info(`[validateInput] Input value: '${trimmedValue}'. Required: ${!isNotRequired}`)

        // Check if the input is empty
        if (trimmedValue === '') {
            this.formChippy.debug.info(
                `[validateInput] Required input is empty, validation FAILED`
            )
            this.showInputError(elementToApplyError, 'This field is required')
            return false
        }

        this.formChippy.debug.info(`[validateInput] Input passed basic validation.`) // Assuming more complex validation could go here
        // All other validation is skipped per requirements
        return true
    }

    /**
     * Validate radio button groups within a specific slide,
     * handling mixed groups of standard radios and radiofields.
     * @param {HTMLElement} slide - The slide containing the radio groups
     * @returns {boolean} - True if all radio groups are valid, false otherwise
     */
    validateRadioGroup(slide) {
        const slideId = slide.getAttribute('data-fc-slide')
        this.formChippy.debug.info(
            `Starting unified radio/radiofield group validation for slide: ${slideId}`
        )

        // --- Step 1: Collect all radio inputs and their context ---
        const allRadioInputs = slide.querySelectorAll('input[type="radio"]')
        this.formChippy.debug.info(
            `Found ${allRadioInputs.length} total radio inputs in slide ${slideId}`
        )

        if (allRadioInputs.length === 0) {
            this.formChippy.debug.info(
                'No radio inputs found, skipping radio validation'
            )
            return true
        }

        // --- Step 2: Group radios by name and gather details ---
        const radiosByName = {}
        allRadioInputs.forEach((radio) => {
            if (radio.name) {
                const groupName = radio.name
                if (!radiosByName[groupName]) {
                    radiosByName[groupName] = [] // Initialize group if it doesn't exist
                }

                const radioFieldWrapper = radio.closest(
                    '[data-fc-element="radiofield"]'
                )
                const standardRadioWrapper = radio.closest(
                    '[data-fc-element="radio"], [data-fc-element="radio-input-field"]'
                )
                let inputFields = []
                let wrapperElement =
                    radioFieldWrapper || standardRadioWrapper || radio // Fallback to radio itself

                if (radioFieldWrapper) {
                    // If it's in a radiofield, find associated inputs within that wrapper
                    inputFields = Array.from(
                        radioFieldWrapper.querySelectorAll(
                            'input:not([type="radio"]), textarea, select'
                        )
                    )
                    this.formChippy.debug.info(
                        `Radio '${radio.value}' (group '${groupName}') is in a radiofield with ${inputFields.length} associated inputs.`
                    )
                } else {
                    this.formChippy.debug.info(
                        `Radio '${radio.value}' (group '${groupName}') is a standard radio or loose input.`
                    )
                }

                radiosByName[groupName].push({
                    radio: radio,
                    isRadioField: !!radioFieldWrapper, // Boolean flag
                    wrapper: wrapperElement, // The radiofield wrapper, standard wrapper, or the input itself
                    inputFields: inputFields, // Array of associated inputs (only for radiofields)
                })
            } else {
                this.formChippy.debug.warn(
                    `Radio input found without a name attribute, cannot group for validation: ${radio.outerHTML.substring(
                        0,
                        100
                    )}...`
                )
            }
        })

        this.formChippy.debug.info(
            `Grouped radios into ${
                Object.keys(radiosByName).length
            } groups by name: ${Object.keys(radiosByName).join(', ')}`
        )

        // --- Step 3: Validate each group ---
        let allGroupsValid = true

        Object.keys(radiosByName).forEach((groupName) => {
            const groupItems = radiosByName[groupName] // Array of {radio, isRadioField, wrapper, inputFields}
            this.formChippy.debug.info(
                `Validating group: '${groupName}' with ${groupItems.length} item(s)`
            )

            // --- 3a: Check if the group is required ---
            // We check the required status based on any item in the group and its hierarchy.
            // If *any* item suggests it's optional, the whole group is treated as optional.
            const isGroupNotRequired = groupItems.some((item) => {
                const radioElement = item.radio
                const wrapperElement = item.wrapper
                const radioContentElement =
                    radioElement.closest('[data-fc-content]')
                const radioSlideElement =
                    radioElement.closest('[data-fc-slide]')
                const radioQuestionContainer =
                    radioElement.closest('[data-fc-question]')
                const radioLabel =
                    radioQuestionContainer?.querySelector('label') // Check label associated with the container
                const directLabel = document.querySelector(
                    `label[for="${radioElement.id}"]`
                ) // Check direct label

                return (
                    radioElement.getAttribute('data-fc-required') === 'false' ||
                    (wrapperElement !== radioElement &&
                        wrapperElement.getAttribute('data-fc-required') ===
                            'false') || // Check wrapper if it exists and isn't the input itself
                    (radioContentElement &&
                        radioContentElement.getAttribute('data-fc-required') ===
                            'false') ||
                    (radioSlideElement &&
                        radioSlideElement.getAttribute('data-fc-required') ===
                            'false') ||
                    (radioQuestionContainer &&
                        radioQuestionContainer.getAttribute(
                            'data-fc-required'
                        ) === 'false') ||
                    (radioLabel &&
                        radioLabel.getAttribute('data-fc-required') ===
                            'false') ||
                    (directLabel &&
                        directLabel.getAttribute('data-fc-required') ===
                            'false')
                )
            })

            this.formChippy.debug.info(
                `Group '${groupName}' status: ${
                    isGroupNotRequired ? 'Optional' : 'Required'
                }`
            )

            // --- 3b: Handle Optional Group ---
            if (isGroupNotRequired) {
                this.formChippy.debug.info(
                    `Skipping required check for optional group '${groupName}'`
                )
                // Clear any "Please select an option" error for the group
                const firstItemWrapper = groupItems[0].wrapper
                const displayElement =
                    firstItemWrapper.closest('[data-fc-question]') ||
                    firstItemWrapper.closest('[data-fc-content]') ||
                    firstItemWrapper
                this.toggleContentError(displayElement, false)

                // Also clear errors on any inputs within radiofields in this optional group
                groupItems.forEach((item) => {
                    if (item.isRadioField && item.inputFields.length > 0) {
                        this.formChippy.debug.info(
                            `Clearing errors for ${item.inputFields.length} inputs in unselected radiofield (value: ${item.radio.value}) of failed group '${groupName}'`
                        )
                        item.inputFields.forEach((input) =>
                            this.clearInputError(input)
                        )
                    }
                })
                return // Skip to the next group
            }

            // --- 3c: Check if any radio in the REQUIRED group is checked ---
            const selectedItem = groupItems.find((item) => item.radio.checked)
            const isChecked = !!selectedItem // True if an item was found
            this.formChippy.debug.info(
                `Group '${groupName}' has a selected option: ${
                    isChecked ? 'Yes' : 'No'
                }`
            )

            // Find a suitable element to display the "Please select" error (use the first item's context)
            const firstItem = groupItems[0]
            const groupErrorDisplayElement =
                firstItem.radio.closest('[data-fc-question]') ||
                firstItem.radio.closest('[data-fc-content]') ||
                firstItem.wrapper

            if (!isChecked) {
                // No radio selected in a required group - show error
                this.formChippy.debug.info(
                    `Group '${groupName}' failed: No option selected.`
                )
                if (groupErrorDisplayElement) {
                    this.toggleContentError(
                        groupErrorDisplayElement,
                        true,
                        'Please select an option'
                    )
                } else {
                    this.formChippy.debug.warn(
                        `Could not find suitable element to display 'Please select an option' error for group ${groupName}`
                    )
                }
                allGroupsValid = false

                // Ensure inputs in any radiofields within this failed group are cleared of errors
                groupItems.forEach((item) => {
                    if (item.isRadioField && item.inputFields.length > 0) {
                        this.formChippy.debug.info(
                            `Clearing errors for ${item.inputFields.length} inputs in unselected radiofield (value: ${item.radio.value}) of failed group '${groupName}'`
                        )
                        item.inputFields.forEach((input) =>
                            this.clearInputError(input)
                        )
                    }
                })

                return // Skip further validation for this group
            }

            // --- 3d: A radio IS selected in the required group ---
            this.formChippy.debug.info(
                `Selected option in group '${groupName}': ${selectedItem.radio.value}`
            )

            // Clear the group-level error ("Please select an option")
            if (groupErrorDisplayElement) {
                this.toggleContentError(groupErrorDisplayElement, false)
            }

            // Validate inputs IF the selected item is a radiofield with inputs
            if (
                selectedItem.isRadioField &&
                selectedItem.inputFields.length > 0
            ) {
                this.formChippy.debug.info(
                    `Validating ${selectedItem.inputFields.length} input fields in selected radiofield for group '${groupName}'`
                )
                let allSelectedInputsValid = true
                selectedItem.inputFields.forEach((inputField) => {
                    // Use existing validateInput, passing the radiofield wrapper for context
                    if (!this.validateInput(inputField, selectedItem.wrapper)) {
                        allSelectedInputsValid = false
                        this.formChippy.debug.info(
                            `Input field validation failed for ${
                                inputField.name || 'unnamed field'
                            } in selected radiofield of group '${groupName}'`
                        )
                    }
                })

                if (!allSelectedInputsValid) {
                    allGroupsValid = false // If any input in the selected radiofield fails, the whole group fails validation for this slide check
                    this.formChippy.debug.info(
                        `Group '${groupName}' failed: Input validation failed within the selected radiofield.`
                    )
                }
            } else {
                this.formChippy.debug.info(
                    `Selected item in group '${groupName}' is not a radiofield or has no inputs to validate.`
                )
            }

            // Clear errors for inputs within any UNSELECTED radiofields in this group
            groupItems.forEach((item) => {
                if (
                    item !== selectedItem &&
                    item.isRadioField &&
                    item.inputFields.length > 0
                ) {
                    this.formChippy.debug.info(
                        `Clearing errors for ${item.inputFields.length} inputs in non-selected radiofield (value: ${item.radio.value}) of group '${groupName}'`
                    )
                    item.inputFields.forEach((input) => {
                        this.clearInputError(input)
                        // Clear potential error on the wrapper itself if needed (might have been set by validateInput)
                        this.clearInputError(item.wrapper)
                        // Ensure the higher-level content error is also cleared if appropriate
                        const contentElem = input.closest('[data-fc-content]')
                        if (
                            contentElem &&
                            contentElem.classList.contains(
                                this.options.errorClass
                            )
                        ) {
                            this.toggleContentError(input, false) // Use input context to find correct error message span
                        }
                    })
                }
            })
        }) // End of loop through each group name

        this.formChippy.debug.info(
            `Unified radio validation finished for slide ${slideId}: ${
                allGroupsValid ? 'Passed' : 'Failed'
            }`
        )
        return allGroupsValid
    }

    /**
     * Listens for 'change' events on inputs, textareas, and selects within slides.
     * Calls `updateFormData` to store the value.
     * For radio buttons, it also triggers `updateFormData` for all associated inputs
     * within any radiofield in the same group to ensure data consistency (adding/removing
     * nested input data based on radio selection).
     * Triggers slide validation after an input changes.
     */
    setupInputChangeListeners() {
        // Use event delegation on the container to catch all input changes
        const container = document.querySelector(this.options.containerSelector)
        if (!container) return

        // Listen for input events (fires as the user types)
        container.addEventListener('input', (event) => {
            const input = event.target

            // Handle all input types
            if (
                input.tagName === 'INPUT' && input.type !== 'radio' && input.type !== 'checkbox' ||
                input.tagName === 'TEXTAREA' ||
                input.tagName === 'SELECT'
            ) {
                // Log the input value immediately when the event fires
                this.formChippy.debug.info(`[Input Event] Input on '${input.name || input.type}'. Value: '${input.value}'`);

                // 1. Update the form data
                this.updateFormData(input)

                // 2. Re-validate the entire slide immediately
                const slideElement = input.closest('[data-fc-slide]')
                if (slideElement) {
                    const isValid = this.validateSlide(slideElement) // This will trigger detailed logs inside validateSlide
                    this.formChippy.debug.info(`[Input Event] Result of validateSlide after input: ${isValid ? 'Valid' : 'Invalid'}`)
                } else {
                    this.formChippy.debug.warn(`[Input Event] Could not find parent slide for input: ${input.name || input.id}`)
                }
            }
        })

        // Listen for change events (fires when input loses focus or radio/checkbox clicked)
        container.addEventListener('change', (event) => {
            const input = event.target

            // Special handling for radio buttons
            if (input.type === 'radio') {
                // 1. Update form data for the radio button itself (only if checked)
                this.updateFormData(input)

                // --- Update Associated Inputs in RadioFields ---
                // When a radio changes, we must explicitly update the data state
                // for ALL inputs within ANY radiofield belonging to this group.
                const groupName = input.name
                const slideElement = input.closest('[data-fc-slide]')
                if (slideElement && groupName) {
                    const radiosInGroup = slideElement.querySelectorAll(
                        `input[type="radio"][name="${groupName}"]`
                    )
                    radiosInGroup.forEach((radioInGroup) => {
                        const radioFieldWrapper = radioInGroup.closest(
                            '[data-fc-element="radiofield"]'
                        )
                        if (radioFieldWrapper) {
                            const associatedInputs =
                                radioFieldWrapper.querySelectorAll(
                                    'input:not([type="radio"]), textarea, select'
                                )
                            associatedInputs.forEach((associatedInput) => {
                                this.formChippy.debug.info(
                                    `Triggering updateFormData for associated input '${associatedInput.name || associatedInput.dataset.fcInput}' due to radio '${groupName}' change.`
                                )
                                this.updateFormData(associatedInput) // This will check the radio's state
                            })
                        }
                    })
                } else {
                    this.formChippy.debug.warn(
                        `Could not find slide or group name to update associated radiofield inputs for:`,
                        input
                    )
                }
                // ---------------------------------------------

                // 2. Update form data for inputs within the *related* radiofields
                if (input.checked && input.name) {
                    // Find all radios in the same group within this slide
                    const groupName = input.name
                    const radiosInGroup = slideElement.querySelectorAll(
                        `input[type="radio"][name="${groupName}"]`
                    )

                    this.formChippy.debug.info(
                        `Radio '${input.value}' changed. Updating related radiofield inputs for group '${groupName}'.`
                    )

                    radiosInGroup.forEach((radioInGroup) => {
                        const radioFieldWrapper = radioInGroup.closest(
                            '[data-fc-element="radiofield"]'
                        )
                        if (radioFieldWrapper) {
                            const associatedInputs =
                                radioFieldWrapper.querySelectorAll(
                                    'input:not([type="radio"]), textarea, select'
                                )
                            associatedInputs.forEach((associatedInput) => {
                                // Call updateFormData for the associated input.
                                // This will add/update its value if its radio is checked,
                                // or remove it if its radio is now unchecked.
                                this.formChippy.debug.info(
                                    `  - Triggering updateFormData for associated input '${
                                        associatedInput.name || 'unnamed'
                                    }' (parent radio: '${radioInGroup.value}')`
                                )
                                this.updateFormData(associatedInput)
                            })
                        }
                    })
                }

                // 3. Immediately clear errors and revalidate when a radio is selected
                if (input.checked) {
                    // Find all related elements
                    const group = input.closest('[data-fc-input-group]')
                    const contentElement = input.closest('[data-fc-content]')
                    const slide = input.closest('[data-fc-slide]')

                    // Always clear any error states when a radio is selected
                    if (group) {
                        this.clearInputError(group) // Clear error on the group element
                    }

                    // Explicitly clear content element errors
                    if (contentElement) {
                        contentElement.classList.remove(this.options.errorClass, 'error')
                        // Remove any error message elements
                        const errorMessages = contentElement.querySelectorAll('.fc-error-message')
                        errorMessages.forEach(el => el.remove())
                        this.formChippy.debug.info(`Radio '${input.value}' selected - cleared content errors for group '${input.name}'`)
                    }

                    // Revalidate the slide to ensure validation state is updated
                    if (slide) {
                        const isValid = this.validateSlide(slide)
                        this.formChippy.debug.info(`Radio '${input.value}' selected - slide validation result: ${isValid ? 'Valid' : 'Invalid'}`)
                    }
                }
            }
            // Handle change events for non-radio inputs
            else if (
                input.tagName === 'INPUT' ||
                input.tagName === 'TEXTAREA' ||
                input.tagName === 'SELECT'
            ) {
                // 1. Update the form data (includes logic for inputs inside radiofields)
                this.updateFormData(input)

                // 2. Re-validate the input to give immediate feedback
                //    Especially important for inputs inside *selected* radiofields.
                const radioFieldWrapper = input.closest(
                    '[data-fc-element="radiofield"]'
                )
                if (radioFieldWrapper) {
                    const associatedRadio = radioFieldWrapper.querySelector(
                        'input[type="radio"]'
                    )
                    // Only re-validate if the associated radio is actually checked
                    if (associatedRadio && associatedRadio.checked) {
                        this.formChippy.debug.info(
                            `Re-validating input '${
                                input.getAttribute('data-input') || input.name
                            }' in selected radiofield on change.`
                        )
                        // Determine context for error message placement
                        const fieldElement = input.closest(
                            '[data-fc-element="field"]'
                        ) // Check if it's inside a Webflow-style field
                        const contextElement = fieldElement || input // Use field wrapper if available, otherwise the input itself
                        this.validateInput(input, contextElement) // Call validation
                    } else {
                        this.formChippy.debug.info(
                            `Input '${
                                input.getAttribute('data-input') || input.name
                            }' changed in a NON-selected radiofield, skipping immediate re-validation.`
                        )
                    }
                } else {
                    // For regular inputs not in radiofields, re-validate on change too
                    this.formChippy.debug.info(
                        `Re-validating standard input '${
                            input.getAttribute('data-input') || input.name
                        }' on change.`
                    )
                    const fieldElement = input.closest(
                        '[data-fc-element="field"]'
                    )
                    const contextElement = fieldElement || input
                    this.validateInput(input, contextElement)
                }
            }
        })
    }

    /**
     * Show input error
     * @param {HTMLElement} input - Input element
     * @param {string} message - Error message
     */
    showInputError(input, message) {
        this.formChippy.debug.info(`[showInputError] Called for: ${input.tagName}, Message: ${message}`)
        const isGroup = !input.matches('input, textarea, select')
        const targetElement = isGroup ? input : input.closest('[data-fc-element="field"]') || input
        this.formChippy.debug.info(`[showInputError] Target element for error class: ${targetElement.tagName}${targetElement.id ? '#' + targetElement.id : ''}`)

        // Add error class to the target element (field wrapper or input itself)
        targetElement.classList.add('fc-error', 'error')

        // Log validation error
        this.formChippy.debug.logValidation(input, false, message)

        // Check if input is empty and add empty class if needed (only for standard inputs)
        if (input.matches('input, textarea, select')) {
            if (input.value.trim() === '') {
                input.classList.add('fc-empty', 'empty')
            } else {
                input.classList.remove('fc-empty', 'empty')
            }
        }

        // Handle group elements differently if needed
        if (!input.matches('input, textarea, select')) {
            input.classList.add('fc-error', 'error') // Add error class to the group
        } else {
            // Clear error from the input itself
            input.style.borderColor =
                'var(--fc-error-color, var(--mct-error-color, #ff3860))'
            input.classList.add('fc-error', 'error')
        }

        // Find question container
        const questionContainer =
            input.closest('[data-fc-question]') ||
            input.closest('[data-fc-content]') ||
            input.parentNode

        // Add error class to the question container
        questionContainer.classList.add('fc-has-error', 'has-error')

        // Content element error handling is now done by toggleContentError() method

        // Only create error message if there's no custom error element
        if (!questionContainer.querySelector('[data-fc-content-error]')) {
            // Create error message
            let errorElement =
                questionContainer.querySelector('.fc-error-message')
            if (!errorElement) {
                errorElement = document.createElement('div')
                errorElement.className = 'fc-error-message'
                errorElement.style.color =
                    'var(--fc-error-color, var(--mct-error-color, #ff3860))'
                errorElement.style.fontSize = '0.875rem'
                errorElement.style.marginTop = '-1rem'
                errorElement.style.marginBottom = '1rem'
                questionContainer.appendChild(errorElement)
            }
            errorElement.textContent = message
        }

        // Focus the input only for standard inputs
        if (input.matches('input, textarea, select')) {
            input.focus()
        }
    }

    /**
     * Clear input error
     * @param {HTMLElement} input - Input element
     */
    clearInputError(input) {
        this.formChippy.debug.info(`[clearInputError] Called for: ${input.tagName}${input.id ? '#' + input.id : ''}`)
        // Clear error message associated with the content element
        const errorMessageElement = input
            .closest('[data-fc-content]')
            .querySelector('.fc-error-message')

        // Special handling for radio inputs to ensure all related elements are cleared
        if (input.type === 'radio' && input.checked) {
            // First clear the radio input itself
            input.classList.remove('fc-error', 'error')
            
            // Get related containers
            const group = input.closest('[data-fc-input-group]')
            const contentElement = input.closest('[data-fc-content]')
            
            // Clear group error
            if (group) {
                group.classList.remove('fc-error', 'error')
                
                // Remove any error message elements within the group
                const groupErrorMessages = group.querySelectorAll('.fc-error-message')
                groupErrorMessages.forEach(el => el.remove())
            }
            
            // Clear content element error
            if (contentElement) {
                contentElement.classList.remove(this.options.errorClass, 'error')
                
                // Remove any error message elements at the content level
                const contentErrorMessages = contentElement.querySelectorAll('.fc-error-message')
                contentErrorMessages.forEach(el => el.remove())
            }
            
            this.formChippy.debug.info(
                `Enhanced error clearing for radio input '${input.name}' - cleared radio, group and content errors`
            )
            return
        }
        
        // Handle group elements
        if (!input.matches('input, textarea, select')) {
            this.formChippy.debug.info(`[clearInputError] Clearing error from group/non-standard element.`) 
            input.classList.remove('fc-error', 'error') // Remove error class from the group
        } else {
            this.formChippy.debug.info(`[clearInputError] Clearing error from standard input/textarea/select.`) 
            // Clear error from the input itself
            input.style.borderColor = ''
            input.classList.remove('fc-error', 'error')

            // Also clear error from the parent field element if it exists
            const fieldElement = input.closest('[data-fc-element="field"]')
            if (fieldElement) {
                fieldElement.classList.remove('fc-error', 'error')
                this.formChippy.debug.info(
                    `[clearInputError] Cleared error from parent field element: ${fieldElement.tagName}`
                )
            } else {
                this.formChippy.debug.info(`[clearInputError] No parent field element found.`)
            }
        }

        // Check if input is empty and update empty class accordingly (only for standard inputs)
        if (input.matches('input, textarea, select')) {
            if (input.value.trim() === '') {
                input.classList.add('fc-empty', 'empty')
            } else {
                input.classList.remove('fc-empty', 'empty')
            }
        }

        // Find question container
        const questionContainer =
            input.closest('[data-fc-question]') ||
            input.closest('[data-fc-content]') ||
            input.parentNode

        // Remove error class from question container
        questionContainer.classList.remove('fc-has-error', 'has-error')

        // Content element error handling is now done by toggleContentError() method

        // Remove error message
        if (errorMessageElement) {
            errorMessageElement.remove()
        }
        
        // Also clear the error from the parent content element and remove the message
        this.toggleContentError(input, false)
    }

    /**
     * Get the whole form data as a JSON object, organized by slide ID
     * @returns {Object} Form data organized by slide ID
     */
    getFormData() {
        return this.formData
    }

    /**
     * Get flattened form data (all slides combined in one object)
     * @returns {Object} Flattened form data
     */
    getFlatFormData() {
        const flatData = {}

        // Flatten the slide-based structure into a single object
        for (const slideId in this.formData) {
            for (const fieldName in this.formData[slideId]) {
                flatData[fieldName] = this.formData[slideId][fieldName]
            }
        }

        return flatData
    }
}
