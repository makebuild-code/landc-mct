/**
 * FormChippy.js v1.5.3 (Standalone)
 * A smooth, vertical scrolling multi-step form experience
 * Created for L&C Mortgage Finder
 *
 * New in v1.5.3:
 * - Fixed data persistence logic for standard radio button groups.
 * - Corrected data handling for inputs nested within radiofield elements.
 *
 * New in v1.5.2:
 * - Enhanced validation for immediate feedback on input/change
 * - Updated form data is now also stored in local storage as JSON
 *
 * New in v1.5.1:
 * - Refactored initialization and event handling
 *
 * New in v1.5.0:
 * - Introduced Debug module for enhanced troubleshooting
 * - Enhanced form validation system with hierarchical required/optional handling
 * - Added support for 'data-fc-required="false"' at multiple DOM levels (slide, content, field, etc.)
 * - Unified error handling with consistent application of error classes to content elements
 * - Improved debug logging throughout the validation process
 *
 * New in v1.4.1:
 * - Fixed bug where reset button didn't clear storage
 *
 * New in v1.4.0:
 * - Added data persistence options (sessionStorage, localStorage, none)
 * - Support for slides at any nesting level within the slide-list element
 * - Automatic filtering of slides with hidden ancestors (display:none)
 * - Improved slide detection regardless of DOM structure depth
 * - Enhanced debug information showing excluded slides and their status
 *
 * New in v1.3.0:
 * - Progress fraction indicator ("Step X of Y") integrated in core library
 * - Donut progress indicator for circular visualizations
 * - Enhanced progress tracking and visualization options
 *
 * New in v1.2.0:
 * - Percentage-based scroll positioning (e.g., data-fc-slide-position="25%")
 * - Improved overflow control to prevent scrolling after slide navigation
 *
 * @version     1.5.3
 * @license     MIT
 * @author      JP Dionisio
 * Copyright (c) 2025 JP Dionisio
 */
;(function () {
    'use strict'

/**
 * Navigation.js
 * Handles navigation between form slides
 */

class Navigation {
    constructor(formChippy) {
        this.formChippy = formChippy
        this.options = formChippy.options
        this.observer = null
    }

    /**
     * Set up buttons and keyboard navigation
     */
    setupNavigation() {
        this._setupButtons()
        this._setupKeyboardNavigation()

        // Only set up the intersection observer if explicitly enabled in options
        if (this.formChippy.options.useIntersectionObserver === true) {
            this._setupIntersectionObserver()
        }
        
        // Initialize the slide counter on load with current slide index
        this.updateSlideCounter(this.formChippy.currentSlideIndex)
    }

    /**
     * Set up buttons for navigation
     * @private
     */
    _setupButtons() {
        // ===== RESET BUTTONS =====
        // Find all reset buttons
        const resetButtons = this.formChippy.container.querySelectorAll(
            '[data-fc-button="reset"], [data-fc-button-reset]'
        );
        
        if (resetButtons.length > 0) {
            this.formChippy.debug.info(`Found ${resetButtons.length} reset buttons`);
            
            resetButtons.forEach((button) => {
                // Remove existing click listeners by replacing the button
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add the reset event listener
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this.formChippy.debug.info('Reset button clicked');
                    
                    // Get the target slide index (usually 0)
                    let targetIndex = 0;
                    const goToAttr = newButton.getAttribute('data-fc-go-to');
                    
                    if (goToAttr) {
                        // Find slide by id if specified
                        const targetSlide = this.formChippy.slides.findIndex(
                            slide => slide.getAttribute('data-fc-slide') === goToAttr
                        );
                        if (targetSlide !== -1) {
                            targetIndex = targetSlide;
                        }
                    }
                    
                    // Reset the form and navigate to the target slide
                    this.formChippy.reset();
                    this.formChippy.goToSlide(targetIndex);
                });
            });
        }
        
        // ===== NEXT BUTTONS =====
        // Find all next buttons - exclude both submit and prev buttons
        const nextButtons = this.formChippy.container.querySelectorAll(
            '[data-fc-button="next"], [data-fc-button-next]'
        );

        // Store reference to next buttons for consistency
        this.nextButtons = Array.from(nextButtons);
        
        // Clear any existing listeners using the same approach as prev buttons
        this.nextButtons.forEach((button) => {
            // Remove existing click listeners by replacing the button
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            
            // Add the simplified event listener
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get the CURRENT slide index and slide
                const currentIndex = this.formChippy.currentSlideIndex;
                const currentSlide = this.formChippy.slides[currentIndex];
                
                // Log the navigation attempt
                this.formChippy.debug.info(
                    `Next button clicked at index ${currentIndex}`,
                    { direction: 'next' }
                );
                
                // Check validation only if it's enabled
                let isValid = true;
                if (this.formChippy.validationEnabled) {
                    isValid = this.formChippy.validation.validateSlide(currentSlide);
                    this.formChippy.debug.info(`Validation result: ${isValid ? 'PASS' : 'FAIL'}`);
                }
                
                if (isValid) {
                    // Calculate the next index (guard against exceeding slides)
                    const nextIndex = Math.min(currentIndex + 1, this.formChippy.totalSlides - 1);
                    
                    // Direct navigation to next slide with consistent logging
                    this.formChippy.debug.info(`NEXT BUTTON: Navigating from ${currentIndex} to ${nextIndex}`);
                    this.formChippy.goToSlide(nextIndex);
                } else {
                    // Highlight invalid inputs if validation failed
                    this._highlightInvalidInputs(currentSlide);
                }
            })

            // Store the button reference for updating its state later
            if (!this.nextButtons) {
                this.nextButtons = []
            }
            if (!this.nextButtons.includes(button)) {
                this.nextButtons.push(button)
            }
        })

        // ===== PREVIOUS BUTTONS =====
        // Find all previous buttons with either attribute format
        const prevButtons = this.formChippy.container.querySelectorAll(
            '[data-fc-button-prev], [data-fc-button="prev"]'
        );
        
        // Store references to prev buttons for future use
        this.prevButtons = Array.from(prevButtons);
        
        // Clear any existing event listeners (use simpler method than cloning)
        this.prevButtons.forEach((button) => {
            // Remove existing click listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the simplified event listener to the new button
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get the CURRENT slide index at click time
                const currentIndex = this.formChippy.currentSlideIndex;
                
                this.formChippy.debug.info(`Previous button clicked at index ${currentIndex}`);
                
                // Only navigate if we're not on the first slide
                if (currentIndex > 0) {
                    const prevIndex = currentIndex - 1;
                    
                    // Direct navigation to previous slide - consistent with next button approach
                    this.formChippy.debug.info(`PREV BUTTON: Navigating from ${currentIndex} to ${prevIndex}`);
                    this.formChippy.goToSlide(prevIndex);
                } else {
                    this.formChippy.debug.info(`Already at first slide (${currentIndex}), cannot go back`);
                }
            });
        });
        
        // Save buttons for later reference
        this.formChippy.debug.info(`Set up ${this.prevButtons.length} previous buttons`);


        // ===== SUBMIT BUTTON =====
        const submitButton = this.formChippy.container.querySelector(
            this.options.submitSelector
        );

        if (submitButton) {
            // Remove existing click listeners for consistency
            const newSubmitButton = submitButton.cloneNode(true);
            submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
            
            // Store reference
            this.submitButton = newSubmitButton;
            
            // Add new event listener
            newSubmitButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.formChippy.debug.info('Submit button clicked');
                this._handleSubmit();
            });
            
            this.formChippy.debug.info('Submit button set up');
        }
    }
    
    /**
     * Finds the active slide in the DOM by looking for the active class
     * @returns {HTMLElement|null} The active slide or null if not found
     * @private
     */
    _findActiveSlide() {
        const activeClass = this.formChippy.options.activeClass;
        // Search within the slide list instead of the entire container
        const activeSlide = this.formChippy.slideList.querySelector(`[data-fc-slide].${activeClass}`);
        
        if (activeSlide) {
            return activeSlide;
        }
        
        // Second attempt: check if any slide has the active class
        for (const slide of this.formChippy.slides) {
            if (slide.classList.contains(activeClass)) {
                return slide;
            }
        }
        
        return null;
    }

    /**
     * Set up keyboard navigation
     * @private
     */
    _setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Ignore if inside a text input
            if (
                e.target.tagName === 'INPUT' &&
                (e.target.type === 'text' ||
                    e.target.type === 'email' ||
                    e.target.type === 'number')
            ) {
                // Allow Enter key to trigger button
                if (e.key === 'Enter') {
                    const activeSlide = this._findActiveSlide();
                    const slideToDetermineButton = activeSlide || 
                        this.formChippy.slides[this.formChippy.currentSlideIndex];
                        
                    const button = slideToDetermineButton.querySelector(this.options.buttonSelector);
                    if (button) button.click();
                    e.preventDefault();
                }
                return
            }

            // Find active slide to determine actual current index
            const activeSlide = this._findActiveSlide();
            let currentIndex = this.formChippy.currentSlideIndex;
            
            if (activeSlide) {
                const activeIndex = Array.from(this.formChippy.slides).indexOf(activeSlide);
                if (activeIndex !== -1 && activeIndex !== currentIndex) {
                    this.formChippy.debug.info(`Keyboard: Updating current index from ${currentIndex} to ${activeIndex} based on DOM state`);
                    currentIndex = activeIndex;
                    this.formChippy.currentSlideIndex = activeIndex;
                }
            }
                
            // Navigation keys
            switch (e.key) {
                case 'ArrowDown':
                case 'PageDown':
                    if (currentIndex < this.formChippy.totalSlides - 1) {
                        this.formChippy.goToSlide(currentIndex + 1);
                        e.preventDefault();
                    }
                    break

                case 'ArrowUp':
                case 'PageUp':
                    if (currentIndex > 0) {
                        this.formChippy.goToSlide(currentIndex - 1);
                        e.preventDefault();
                    }
                    break

                case 'Home':
                    // Go to first slide
                    this.formChippy.debug.info('Keyboard navigation: Home key - going to first slide');
                    this.formChippy.goToSlide(0);
                    e.preventDefault();
                    break

                case 'End':
                    // Go to last slide
                    const lastIndex = this.formChippy.totalSlides - 1;
                    this.formChippy.debug.info(`Keyboard navigation: End key - going to last slide (${lastIndex})`);
                    this.formChippy.goToSlide(lastIndex);
                    e.preventDefault();
                    break
            }
        })
    }

    /**
     * Set up intersection observer to detect active slide
     * @private
     */
    _setupIntersectionObserver() {
        // Create observer - but only update UI elements, do not auto-navigate
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        entry.intersectionRatio >= 0.5 &&
                        !this.formChippy.isAnimating // Prevent updates during programmatic scrolling
                    ) {
                        const index = this.formChippy.slides.indexOf(
                            entry.target
                        )
                        if (index !== -1) {
                            // Log that we detected a slide in view via IntersectionObserver
                            const slideId = entry.target.getAttribute('data-fc-slide');
                            
                            if (index !== this.formChippy.currentSlideIndex) {
                                this.formChippy.debug.info(`IntersectionObserver: Slide ${slideId} is in view, updating from index ${this.formChippy.currentSlideIndex} to ${index}`);
                                
                                // Update the stored current index to match what's visible
                                this.formChippy.currentSlideIndex = index;
                                
                                // Update visual indicators
                                this.formChippy._updateActiveVisuals(index);
                            }
                        }
                    }
                })
            },
            { threshold: 0.5 }
        )

        // Observe all slides
        this.formChippy.slides.forEach((slide) => {
            this.observer.observe(slide)
        })
    }

    /**
     * Handle form submission
     * @private
     */
    _handleSubmit() {
        // Find the active slide in the DOM first
        const activeSlide = this._findActiveSlide();
        let currentSlide;
        
        if (activeSlide) {
            // Use the active slide from the DOM
            currentSlide = activeSlide;
            
            // Update the stored index if it doesn't match the active slide
            const activeIndex = Array.from(this.formChippy.slides).indexOf(activeSlide);
            if (activeIndex !== -1 && activeIndex !== this.formChippy.currentSlideIndex) {
                this.formChippy.debug.info(`Submit: Updating current index from ${this.formChippy.currentSlideIndex} to ${activeIndex} based on DOM state`);
                this.formChippy.currentSlideIndex = activeIndex;
            }
        } else {
            // Fall back to the stored index if no active slide is found
            currentSlide = this.formChippy.slides[this.formChippy.currentSlideIndex];
        }
        
        // Log the submission attempt
        const slideId = currentSlide.getAttribute('data-fc-slide');
        this.formChippy.debug.info(
            `Form submission attempted from slide ${slideId}`,
            {
                slide: slideId,
                slideIndex: this.formChippy.currentSlideIndex,
                validationEnabled: this.formChippy.validationEnabled
            }
        )

        // Only validate if validation is enabled
        let isValid = true;
        if (this.formChippy.validationEnabled) {
            isValid = this.formChippy.validation.validateSlide(currentSlide);
        } else {
            this.formChippy.debug.info('Submit: Skipping validation because validation is disabled');
        }

        // Log the validation result's effect on form submission
        this._logNavigationValidation(isValid, 'submit')

        if (!isValid) {
            this._highlightInvalidInputs(lastSlide)
            return
        }

        // Collect form data from all slides, not just the current one
        const formData = this._collectFormData()

        // Log successful form data collection
        this.formChippy.debug.info('Form data collected successfully', {
            fieldsCount: Object.keys(formData).length,
        })

        // Trigger submit event
        const submitEvent = new CustomEvent('formchippy:submit', {
            detail: {
                formName: this.formChippy.formName,
                formData: formData,
            },
            bubbles: true,
        })

        this.formChippy.container.dispatchEvent(submitEvent)

        console.log(
            `Form '${this.formChippy.formName}' submitted with data:`,
            formData
        )
    }

    /**
     * Collect form data from all inputs
     * @returns {Object} - Form data
     * @private
     */
    _collectFormData() {
        const formData = {}

        this.formChippy.slides.forEach((slide) => {
            const slideId = slide.getAttribute('data-fc-slide')
            const inputs = slide.querySelectorAll(this.options.inputSelector)

            inputs.forEach((input, inputIndex) => {
                const inputName =
                    input.getAttribute('name') ||
                    `${slideId}-input-${inputIndex}`

                // Handle different input types
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked) {
                        formData[inputName] = input.value
                    }
                } else {
                    formData[inputName] = input.value
                }
            })
        })

        // Store in formChippy instance
        this.formChippy.formData = formData

        return formData
    }

    /**
     * Clean up when destroying the form
     */
    destroy() {
        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect()
        }
    }

    /**
     * Log navigation validation status in debug
     * @param {boolean} isValid - Whether validation passed
     * @param {string} direction - Navigation direction ('next', 'prev', 'submit')
     * @private
     */
    _logNavigationValidation(isValid, direction) {
        if (!this.formChippy.debug || !this.formChippy.debug.enabled) return

        // Create detailed message for debug panel
        const currentSlide =
            this.formChippy.slides[this.formChippy.currentSlideIndex]
        const slideId = currentSlide.getAttribute('data-fc-slide')
        const slideTitle =
            currentSlide.querySelector('[data-fc-slide-title]')?.textContent ||
            `Slide ${this.formChippy.currentSlideIndex + 1}`

        const message = isValid
            ? `✓ Navigation ${direction} allowed from slide ${slideId}`
            : `⚠️ Navigation ${direction} blocked due to validation errors on slide ${slideId}`

        const logLevel = isValid ? 'info' : 'warn'

        this.formChippy.debug[logLevel](message, {
            navigation: {
                allowed: isValid,
                direction,
                fromSlide: {
                    id: slideId,
                    index: this.formChippy.currentSlideIndex,
                    title: slideTitle,
                },
            },
        })

        // Update UI if debug UI is enabled
        if (
            this.formChippy.debug.logToUI &&
            this.formChippy.debug.logContainer
        ) {
            this._updateNavigationValidationUI(isValid, direction, slideId)
        }
    }

    /**
     * Update the navigation validation status in the debug UI
     * @param {boolean} isValid - Whether validation passed
     * @param {string} direction - Navigation direction
     * @param {string} slideId - Current slide ID
     * @private
     */
    _updateNavigationValidationUI(isValid, direction, slideId) {
        const debugContainer = this.formChippy.debug.logContainer
        if (!debugContainer) return

        // Create or update navigation validation section
        let navValidation = debugContainer.querySelector(
            '.fc-debug-nav-validation'
        )

        if (!navValidation) {
            navValidation = document.createElement('div')
            navValidation.className = `fc-debug-nav-validation ${
                isValid ? 'allowed' : 'blocked'
            }`
            debugContainer.appendChild(navValidation)
        } else {
            navValidation.className = `fc-debug-nav-validation ${
                isValid ? 'allowed' : 'blocked'
            }`
        }

        const icon = isValid ? '✓' : '⚠️'
        const status = isValid ? 'allowed' : 'blocked'

        navValidation.innerHTML = `
            <span class="fc-debug-nav-icon">${icon}</span>
            <span class="fc-debug-nav-message">
                Navigation <strong>${direction}</strong> ${status} from slide ${slideId}
                ${
                    !isValid
                        ? '<br><small>Fix validation errors to proceed</small>'
                        : ''
                }
            </span>
        `

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (navValidation && navValidation.parentNode) {
                navValidation.parentNode.removeChild(navValidation)
            }
        }, 5000)
    }

    /**
     * Highlight invalid inputs for better visibility
     * @param {HTMLElement} slide - Slide to highlight invalid inputs on
     * @private
     */
    _highlightInvalidInputs(slide) {
        const invalidInputs = slide.querySelectorAll('.fc-error')

        // Add pulse animation to error messages
        invalidInputs.forEach((input) => {
            const errorMessage = input
                .closest('[data-fc-question]')
                ?.querySelector('.fc-error-message')
            if (errorMessage) {
                // Apply pulse animation
                errorMessage.classList.add('fc-pulse-error')

                // Remove animation class after animation completes
                setTimeout(() => {
                    errorMessage.classList.remove('fc-pulse-error')
                }, 820) // Slightly longer than animation duration
            }
        })

        // Focus the first invalid input
        if (invalidInputs.length > 0) {
            setTimeout(() => {
                invalidInputs[0].focus()
            }, 100)
        }

        // Mark the Next button as invalid
        this._updateNextButtonState(false)
    }

    /**
     * Update the state of the Next button based on validation
     * @param {boolean} isValid - Whether the current slide is valid
     * @private
     */
    _updateNextButtonState(isValid) {
        // Get all next buttons in the current slide
        const currentSlide =
            this.formChippy.slides[this.formChippy.currentSlideIndex]
        const slideNextButtons = currentSlide.querySelectorAll(
            `${this.options.buttonSelector}:not(${this.options.submitSelector}):not([data-fc-button-prev])`
        )

        // Update button visual state
        slideNextButtons.forEach((button) => {
            if (isValid) {
                button.classList.remove(
                    'fc-button-invalid',
                    'invalid',
                    'disabled'
                )
                button.removeAttribute('disabled')
            } else {
                button.classList.add('fc-button-invalid', 'invalid')
                // Do not disable the button completely as we still want it clickable to show validation errors
                // but we want to indicate it's not a valid action yet
            }
        })
    }
    
    /**
     * Update the slide counter in the container
     * @param {number} currentIndex - Current slide index (0-based)
     */
    updateSlideCounter(currentIndex) {
        // Add a data attribute to the container showing current slide / total slides
        const totalSlides = this.formChippy.totalSlides;
        const humanIndex = currentIndex + 1; // Convert to 1-based for display
        
        // Set the attribute on the container
        this.formChippy.container.setAttribute('data-fc-formprogress', `${humanIndex}/${totalSlides}`);
        
        // Also create/update a visually hidden text element for screen readers
        let srCounter = this.formChippy.container.querySelector('.fc-sr-counter');
        
        if (!srCounter) {
            srCounter = document.createElement('div');
            srCounter.className = 'fc-sr-counter';
            srCounter.setAttribute('aria-live', 'polite');
            srCounter.style.position = 'absolute';
            srCounter.style.width = '1px';
            srCounter.style.height = '1px';
            srCounter.style.overflow = 'hidden';
            srCounter.style.clip = 'rect(0, 0, 0, 0)';
            this.formChippy.container.appendChild(srCounter);
        }
        
        srCounter.textContent = `Step ${humanIndex} of ${totalSlides}`;
        
        // Update button states (enable/disable) based on current position
        this.updateButtonStates(currentIndex);
    }
    
    /**
     * Update navigation button states based on current position
     * @param {number} currentIndex - Current slide index
     */
    updateButtonStates(currentIndex) {
        const totalSlides = this.formChippy.totalSlides;
        const disabledClass = 'fc-button-disabled';
        
        this.formChippy.debug.info(`Updating button states for index ${currentIndex}, totalSlides=${totalSlides}`);
        
        // Find all prev buttons in the container
        const prevButtons = Array.from(this.formChippy.container.querySelectorAll(
            '[data-fc-button="prev"], [data-fc-button-prev]'
        ));
        
        // Find all next buttons in the container
        const nextButtons = Array.from(this.formChippy.container.querySelectorAll(
            '[data-fc-button="next"], [data-fc-button-next]'
        ));
        
        // Update previous buttons
        if (prevButtons && prevButtons.length > 0) {
            this.formChippy.debug.info(`Found ${prevButtons.length} prev buttons to update`);
            prevButtons.forEach(button => {
                // Disable prev buttons on first slide
                if (currentIndex === 0) {
                    button.classList.add(disabledClass);
                    button.setAttribute('aria-disabled', 'true');
                } else {
                    button.classList.remove(disabledClass);
                    button.setAttribute('aria-disabled', 'false');
                }
            });
        }
        
        // Update next buttons
        if (nextButtons && nextButtons.length > 0) {
            this.formChippy.debug.info(`Found ${nextButtons.length} next buttons to update`);
            nextButtons.forEach(button => {
                // Check if this is a special button with a go-to attribute
                const hasGoTo = button.hasAttribute('data-fc-go-to');
                
                // Only disable regular next buttons on last slide
                if (!hasGoTo && currentIndex === totalSlides - 1) {
                    button.classList.add(disabledClass);
                    button.setAttribute('aria-disabled', 'true');
                } else {
                    button.classList.remove(disabledClass);
                    button.setAttribute('aria-disabled', 'false');
                }
            });
        }
    }
}


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

class Validation {
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
                // For radio inputs, always maintain an object structure for the slideId
                // This ensures compatibility with radiofield inputs
                if (slideId === input.name) {
                    // Store in a nested object structure to avoid string/object conflicts
                    if (typeof this.formData[slideId] !== 'object' || this.formData[slideId] === null) {
                        this.formData[slideId] = {}
                    }
                    // Store with the original radio name, even when nested
                    this.formData[slideId][input.name] = input.value
                    this.formChippy.debug.info(
                        `Updated radio value for slide '${slideId}' with nested key '${input.name}': ${input.value}`
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
            
            // Find the associated radio button within the wrapper
            const radioName = associatedRadio ? associatedRadio.name : null;
            const originalDataKey = dataKey;
            
            // Only modify the dataKey if both conditions are met:
            // 1. No explicit data-input was provided
            // 2. The input field name would conflict with the radio name
            if (!input.hasAttribute('data-input') && radioName && dataKey === radioName) {
                // Determine input type for generating proper suffix
                let inputTypeSuffix = 'field';
                if (input.type === 'number') {
                    inputTypeSuffix = 'number';
                } else if (input.type === 'text') {
                    inputTypeSuffix = 'text';
                } else if (input.type === 'email') {
                    inputTypeSuffix = 'email';
                } else if (input.type === 'tel') {
                    inputTypeSuffix = 'tel';
                } else if (input.type === 'date') {
                    inputTypeSuffix = 'date';
                } else if (input.type === 'checkbox') {
                    inputTypeSuffix = 'checkbox';
                } else if (input.tagName.toLowerCase() === 'textarea') {
                    inputTypeSuffix = 'textarea';
                } else if (input.tagName.toLowerCase() === 'select') {
                    inputTypeSuffix = 'select';
                }
                
                // Check if we need to add an index (in case of multiple inputs of same type)
                // First, find all inputs of this type within the radiofield
                const similarInputs = Array.from(
                    radioFieldWrapper.querySelectorAll(
                        input.tagName.toLowerCase() === 'select' ? 'select' :
                        input.tagName.toLowerCase() === 'textarea' ? 'textarea' :
                        `input[type="${input.type}"]`
                    )
                );
                
                // Get the index of this input among similar inputs
                const index = similarInputs.indexOf(input);
                
                // Add index to suffix if there are multiple (index > 0 or totalCount > 1)
                let suffix = inputTypeSuffix;
                if (similarInputs.length > 1) {
                    suffix = `${inputTypeSuffix}-${index + 1}`;
                }
                
                // Create the new key
                const newDataKey = `${radioName}-${suffix}`;
                this.formChippy.debug.info(
                    `Generated key '${newDataKey}' for input in radiofield to avoid conflict with radio name`
                );
                
                // Override dataKey for the rest of this method
                dataKey = newDataKey;
            }

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

        // Remove commas for number validation
        const rawValue = trimmedValue.replace(/,/g, '');
        const numberValue = parseFloat(rawValue);

        // Validate number range if the input is of type "number"
        if (input.hasAttribute('min') && input.hasAttribute('max')) {
            const min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : -Infinity;
            const max = input.hasAttribute('max') ? parseFloat(input.getAttribute('max')) : Infinity;
            // Check if the value is within the specified range
            if (numberValue < min || numberValue > max) {
                this.formChippy.debug.info(
                    `[validateInput] Input value (${numberValue}) is out of range [${min}, ${max}], validation FAILED`
                );
                this.showInputError(
                    elementToApplyError,
                    `Value must be between ${min} and ${max}`
                );
                this.toggleContentError(input, true, `Value must be between ${min} and ${max}`);
                return false;
            }
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
                       /*item.inputFields.forEach((input) =>
                            this.clearInputError(input)
                        )*/
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
                        // In Groups: this is causing validation errors
                        /*item.inputFields.forEach((input) =>
                            this.clearInputError(input)
                        )*/
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
            if (typeof this.formData[slideId] === 'object' && this.formData[slideId] !== null) {
                // Check for special case where slideId matches the radio name
                if (slideId in this.formData[slideId]) {
                    // Set the slide ID value from the nested radio property
                    flatData[slideId] = this.formData[slideId][slideId]
                    
                    // Include all properties including the nested value for individual access
                    for (const fieldName in this.formData[slideId]) {
                        flatData[fieldName] = this.formData[slideId][fieldName]
                    }
                } else {
                    // Normal case - copy all properties
                    for (const fieldName in this.formData[slideId]) {
                        flatData[fieldName] = this.formData[slideId][fieldName]
                    }
                }
            } else {
                // Direct value (for backwards compatibility)
                flatData[slideId] = this.formData[slideId]
            }
        }

        return flatData
    }
}


/**
 * Progress.js
 * Handles progress indicators, navigation dots, and progress fraction display
 *
 * Features:
 * - Progress bar: Visual indicator of form completion progress
 * - Navigation dots: Clickable dots for direct navigation between slides
 * - Progress fraction: Text-based "Step X of Y" indicator for current position
 *
 * Usage:
 * - Progress bar: Add an element with [data-fc-progress] attribute
 * - Navigation dots: Add an element with [data-fc-dots] attribute
 * - Progress fraction: Add an element with [data-fc-progress-fraction-container] attribute
 */

class Progress {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.dots = [];
    }

    /**
     * Create navigation dots
     * If a template dot exists in the dots container, it will be used as a template for generating all dots
     */
    createNavigationDots() {
        if (!this.formChippy.dotsContainer) return;
        
        // Check for template dot
        const templateDot = this.formChippy.dotsContainer.querySelector('[data-fc-dot]');
        const hasTemplate = templateDot !== null;
        
        // Store template before clearing if it exists
        const dotTemplate = hasTemplate ? templateDot.cloneNode(true) : null;
        
        // Clear existing dots
        this.formChippy.dotsContainer.innerHTML = '';
        
        this.formChippy.debug.info(`Creating navigation dots${hasTemplate ? ' using template' : ''}`);
        
        // Create dots for each slide
        this.formChippy.slides.forEach((slide, index) => {
            let dot;
            
            if (hasTemplate) {
                // Use the template if available
                dot = dotTemplate.cloneNode(true);
                
                // Clear any existing click events by cloning without events
                const newDot = dot.cloneNode(true);
                dot.parentNode?.replaceChild(newDot, dot);
                dot = newDot;
            } else {
                // Create a new dot from scratch
                dot = document.createElement('div');
                dot.setAttribute('data-fc-dot', '');
            }
            
            // Set common attributes regardless of template usage
            dot.setAttribute('data-index', index);
            dot.setAttribute('data-slide', slide.getAttribute('data-fc-slide') || `slide-${index + 1}`);
            dot.setAttribute('role', 'button');
            dot.setAttribute('tabindex', '0');
            dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
            
            // Add click event
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.formChippy.goToSlide(index);
            });
            
            // Add keyboard event for accessibility
            dot.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.formChippy.goToSlide(index);
                }
            });
            
            // Add to container
            this.formChippy.dotsContainer.appendChild(dot);
        });

        // Store dots for later use
        this.dots = Array.from(
            this.formChippy.dotsContainer.querySelectorAll(this.options.dotSelector)
        );
        
        // Set initial active dot
        this.updateProgress(this.formChippy.currentSlideIndex);
    }

    /**
     * Create or update the progress bar structure
     * Creates a proper progress-wrap and progress-bar structure
     */
    createProgressBar() {
        // Get the progress container
        const progressContainer = this.formChippy.container.querySelector(this.options.progressSelector);
        if (!progressContainer) return;
        
        // Clear existing content
        progressContainer.innerHTML = '';
        
        // Create proper progress bar structure
        const progressWrap = document.createElement('div');
        progressWrap.classList.add('fc-progress-wrap');
        progressWrap.setAttribute('data-fc-progress-wrap', '');
        progressWrap.setAttribute('role', 'progressbar');
        progressWrap.setAttribute('aria-valuemin', '0');
        progressWrap.setAttribute('aria-valuemax', '100');
        progressWrap.setAttribute('aria-valuenow', '0');
        
        const progressBar = document.createElement('div');
        progressBar.classList.add('fc-progress-bar');
        progressBar.setAttribute('data-fc-progress-bar', '');
        
        const progressFill = document.createElement('div');
        progressFill.classList.add('fc-progress-fill');
        progressFill.setAttribute('data-fc-progress-fill', '');
        
        // Assemble the structure
        progressBar.appendChild(progressFill);
        progressWrap.appendChild(progressBar);
        progressContainer.appendChild(progressWrap);
        
        // Store reference to the fill element
        this.formChippy.progressBar = progressFill;
    }
    
    /**
     * Create progress fraction indicator
     * Creates or updates elements for showing step count (e.g., "Step 1 of 5")
     */
    createProgressFraction() {
        // Check for existing fraction elements first
        const numeratorElement = this.formChippy.container.querySelector('[data-fc-progress-fraction="numerator"]');
        const denominatorElement = this.formChippy.container.querySelector('[data-fc-progress-fraction="denominator"]');
        
        // If both elements already exist, we don't need to create them
        if (numeratorElement && denominatorElement) {
            this.formChippy.debug.info('Progress fraction elements already exist');
            return;
        }
        
        // If elements don't exist but there's a container marked for progress fraction, create the elements
        const fractionContainer = this.formChippy.container.querySelector('[data-fc-progress-fraction-container]');
        if (fractionContainer) {
            // Clear existing content
            fractionContainer.innerHTML = '';
            
            // Create structure: Step <span>1</span> of <span>5</span>
            const prefix = document.createTextNode('Step ');
            const numerator = document.createElement('span');
            numerator.setAttribute('data-fc-progress-fraction', 'numerator');
            numerator.textContent = '1'; // Default value, will be updated
            
            const separator = document.createTextNode(' of ');
            
            const denominator = document.createElement('span');
            denominator.setAttribute('data-fc-progress-fraction', 'denominator');
            denominator.textContent = this.formChippy.totalSlides.toString();
            
            // Assemble the elements
            fractionContainer.appendChild(prefix);
            fractionContainer.appendChild(numerator);
            fractionContainer.appendChild(separator);
            fractionContainer.appendChild(denominator);
            
            this.formChippy.debug.info('Created progress fraction elements', {
                container: fractionContainer,
                totalSlides: this.formChippy.totalSlides
            });
        }
    }

    /**
     * Update progress indicators based on current slide
     * @param {number} index - Current slide index
     */
    updateProgress(index) {
        // Update dots
        if (this.dots && this.dots.length > 0) {
            this.dots.forEach((dot, i) => {
                if (i === index) {
                    // Set active class and ARIA attributes for the active dot
                    dot.classList.add(this.options.activeClass);
                    dot.setAttribute('aria-current', 'true');
                    
                    // Make sure it's properly tabbable for keyboard navigation
                    dot.setAttribute('tabindex', '0');
                    
                    // Log which dot is active for debugging
                    if (this.formChippy.debug && this.formChippy.debug.enabled) {
                        const slideId = dot.getAttribute('data-slide');
                        this.formChippy.debug.info(`Navigation dot activated for slide: ${slideId}`, {
                            index: i,
                            slideId: slideId
                        });
                    }
                } else {
                    // Remove active class and attributes from inactive dots
                    dot.classList.remove(this.options.activeClass);
                    dot.removeAttribute('aria-current');
                    dot.setAttribute('tabindex', '0'); // Keep tabbable but not current
                }
            });
        }

        // Update progress bar using the position tracker as source of truth
        if (this.formChippy.progressBar) {
            // Get the true progress percentage based on current index
            const slideTracker = this.formChippy._slidePositionTracker;
            const totalSlides = this.formChippy.totalSlides;
            
            // Calculate progress based on true current slide position
            let currentIndex, progress;
            if (slideTracker) {
                // Use the position tracker for more accurate progress
                currentIndex = slideTracker.currentIndex;
                progress = ((currentIndex + 1) / totalSlides) * 100;
                this.formChippy.debug.info(`Progress updated from tracker: ${progress.toFixed(1)}%`, {
                    currentIndex: currentIndex,
                    totalSlides: totalSlides
                });
            } else {
                // Fallback to standard calculation
                currentIndex = index;
                progress = ((currentIndex + 1) / totalSlides) * 100;
            }
            
            // Get the correct elements (specifically targeting the fill element)
            let progressFill = this.formChippy.progressBar;
            
            // If not already set, find it first
            if (!progressFill) {
                progressFill = this.formChippy.container.querySelector('[data-fc-progress-fill]');
                if (progressFill) {
                    // Store for future use
                    this.formChippy.progressBar = progressFill;
                }
            }
            
            // Apply the width change to the fill element
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
                this.formChippy.debug.info(`Setting progress fill width to ${progress}%`);
            }
            
            // Also update ARIA attributes on the wrapper
            const progressWrap = this.formChippy.container.querySelector('[data-fc-progress-wrap]');
            if (progressWrap) {
                progressWrap.setAttribute('aria-valuenow', progress);
            }
            
            // Update the progress fraction (step counter)
            this.updateProgressFraction(currentIndex, totalSlides);
            
            // Update the donut progress indicator if available
            if (this.formChippy.donutProgress && this.formChippy.donutProgress.initialized) {
                this.formChippy.donutProgress.updateProgress(progress);
                this.formChippy.debug.info(`Donut progress synced with main progress: ${progress.toFixed(1)}%`);
            }
        }
    }
    
    /**
     * Update the progress fraction (step counter) elements
     * @param {number} currentIndex - Current slide index (0-based)
     * @param {number} totalSlides - Total number of slides
     */
    updateProgressFraction(currentIndex, totalSlides) {
        // Find the fraction elements
        const numeratorElement = this.formChippy.container.querySelector('[data-fc-progress-fraction="numerator"]');
        const denominatorElement = this.formChippy.container.querySelector('[data-fc-progress-fraction="denominator"]');
        
        // Update numerator (current step, 1-based)
        if (numeratorElement) {
            // Add 1 to make it 1-indexed for users
            numeratorElement.textContent = (currentIndex + 1).toString();
        }
        
        // Update denominator (total slides)
        if (denominatorElement) {
            denominatorElement.textContent = totalSlides.toString();
        }
        
        if (numeratorElement || denominatorElement) {
            this.formChippy.debug.info(`Updated progress fraction: ${currentIndex + 1}/${totalSlides}`);
        }
    }
    
    /**
     * Clean up when destroying the form
     */
    destroy() {
        // Remove dots
        if (this.formChippy.dotsContainer) {
            this.formChippy.dotsContainer.innerHTML = '';
        }
    }
}


/**
 * Debug.js
 * Provides debugging capabilities for FormChippy
 */

class Debug {
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
                    //console.debug(`[FormChippy Debug] ${message}`, data || '');
                    break;
                case 'info':
                    //console.info(`[FormChippy Info] ${message}`, data || '');
                    break;
                case 'warn':
                    //console.warn(`[FormChippy Warning] ${message}`, data || '');
                    break;
                case 'error':
                    //console.error(`[FormChippy Error] ${message}`, data || '');
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


/**
 * Text.js
 * Handles text, email, and number input types
 */

class TextInput {
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


/**
 * Radio.js
 * Handles radio button inputs
 */

class RadioInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize radio input handling
     * @private
     */
    _init() {
        // Find all radio inputs
        const radioGroups = this._getRadioGroups();
        
        // Add event listeners
        radioGroups.forEach(group => {
            const radios = group.querySelectorAll(`${this.options.inputSelector}[type="radio"]`);
            
            radios.forEach(radio => {
                // Change event for auto-advance
                radio.addEventListener('change', () => {
                    // Clear any errors
                    this.formChippy.validation.clearInputError(radio);
                    
                    // Auto-advance if enabled
                    if (radio.hasAttribute('data-fc-auto-advance') || 
                        group.hasAttribute('data-fc-auto-advance')) {
                        
                        // Find the slide containing this radio
                        const slide = radio.closest(this.options.slideSelector);
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
                
                // Keyboard handling for better accessibility
                radio.addEventListener('keydown', (e) => {
                    // Allow space to select
                    if (e.key === ' ') {
                        e.preventDefault();
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                    }
                });
            });
        });
    }
    
    /**
     * Get all radio groups in the form
     * @returns {Array} Array of radio group containers
     * @private
     */
    _getRadioGroups() {
        const groups = [];
        const radios = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[type="radio"]`
        );
        
        // Group radios by name attribute
        const nameGroups = {};
        
        radios.forEach(radio => {
            const name = radio.getAttribute('name');
            if (!name) return;
            
            if (!nameGroups[name]) {
                nameGroups[name] = [];
            }
            
            nameGroups[name].push(radio);
        });
        
        // Find common parent for each group
        Object.values(nameGroups).forEach(groupRadios => {
            if (groupRadios.length > 0) {
                // Try to find a container with 'data-fc-radio-group'
                let container = groupRadios[0].closest('[data-fc-radio-group]');
                
                // If not found, use the closest common parent
                if (!container) {
                    // Find closest parent that contains all radios
                    const parents = [];
                    let parent = groupRadios[0].parentElement;
                    
                    while (parent) {
                        if (parent.contains(groupRadios[0])) {
                            parents.push(parent);
                        }
                        parent = parent.parentElement;
                    }
                    
                    // Find the first parent that contains all radios
                    container = parents.find(p => 
                        groupRadios.every(r => p.contains(r))
                    );
                }
                
                if (container) {
                    groups.push(container);
                }
            }
        });
        
        return groups;
    }
    
    /**
     * Style radio buttons with custom appearance
     * @param {HTMLElement} container - Radio group container
     */
    styleRadioGroup(container) {
        // Apply custom styling if needed
        if (container.hasAttribute('data-fc-style') && 
            !container.classList.contains('fc-styled')) {
            
            const style = container.getAttribute('data-fc-style');
            const radios = container.querySelectorAll(`${this.options.inputSelector}[type="radio"]`);
            
            // Apply different styles based on style attribute
            switch (style) {
                case 'cards':
                    this._applyCardStyle(container, radios);
                    break;
                case 'buttons':
                    this._applyButtonStyle(container, radios);
                    break;
                case 'toggle':
                    this._applyToggleStyle(container, radios);
                    break;
            }
            
            // Mark as styled
            container.classList.add('fc-styled');
        }
    }
    
    /**
     * Apply card style to radio buttons
     * @param {HTMLElement} container - Radio group container
     * @param {NodeList} radios - Radio inputs
     * @private
     */
    _applyCardStyle(container, radios) {
        radios.forEach(radio => {
            const label = radio.closest('label') || 
                          container.querySelector(`label[for="${radio.id}"]`);
            
            if (label) {
                label.classList.add('fc-radio-card');
                
                // Hide the original radio
                radio.style.position = 'absolute';
                radio.style.opacity = '0';
                
                // Create custom radio appearance
                const customRadio = document.createElement('span');
                customRadio.className = 'fc-custom-radio-card';
                label.appendChild(customRadio);
            }
        });
    }
    
    /**
     * Apply button style to radio buttons
     * @param {HTMLElement} container - Radio group container
     * @param {NodeList} radios - Radio inputs
     * @private
     */
    _applyButtonStyle(container, radios) {
        // Create a button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'fc-radio-buttons';
        container.appendChild(buttonContainer);
        
        radios.forEach(radio => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fc-radio-button';
            button.textContent = radio.getAttribute('data-label') || radio.value;
            button.setAttribute('data-value', radio.value);
            
            // Mark as selected if radio is checked
            if (radio.checked) {
                button.classList.add('selected');
            }
            
            // Button click handler
            button.addEventListener('click', () => {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
                
                // Update button styles
                Array.from(buttonContainer.children).forEach(btn => {
                    btn.classList.remove('selected');
                });
                button.classList.add('selected');
            });
            
            buttonContainer.appendChild(button);
        });
        
        // Hide original radios
        radios.forEach(radio => {
            radio.style.display = 'none';
        });
    }
    
    /**
     * Apply toggle style to radio buttons
     * @param {HTMLElement} container - Radio group container
     * @param {NodeList} radios - Radio inputs
     * @private
     */
    _applyToggleStyle(container, radios) {
        // Only works with 2 options
        if (radios.length !== 2) return;
        
        // Create toggle container
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'fc-toggle';
        container.appendChild(toggleContainer);
        
        // Create toggle handle
        const handle = document.createElement('span');
        handle.className = 'fc-toggle-handle';
        toggleContainer.appendChild(handle);
        
        // Create labels
        radios.forEach((radio, index) => {
            const label = document.createElement('span');
            label.className = 'fc-toggle-label';
            label.textContent = radio.getAttribute('data-label') || radio.value;
            label.setAttribute('data-value', radio.value);
            
            // Mark as selected if radio is checked
            if (radio.checked) {
                label.classList.add('selected');
                handle.style.transform = `translateX(${index * 100}%)`;
            }
            
            // Label click handler
            label.addEventListener('click', () => {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
                
                // Update toggle styles
                Array.from(toggleContainer.querySelectorAll('.fc-toggle-label')).forEach(lbl => {
                    lbl.classList.remove('selected');
                });
                label.classList.add('selected');
                
                // Move handle
                handle.style.transform = `translateX(${index * 100}%)`;
            });
            
            toggleContainer.appendChild(label);
        });
        
        // Hide original radios
        radios.forEach(radio => {
            radio.style.display = 'none';
        });
    }
}


/**
 * Toggle.js
 * Handles toggle/checkbox inputs
 */

class ToggleInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize toggle input handling
     * @private
     */
    _init() {
        // Find all checkbox inputs
        const checkboxes = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[type="checkbox"]`
        );
        
        // Add event listeners
        checkboxes.forEach(checkbox => {
            // Change event
            checkbox.addEventListener('change', () => {
                // Clear any errors
                this.formChippy.validation.clearInputError(checkbox);
                
                // Auto-advance if enabled
                if (checkbox.hasAttribute('data-fc-auto-advance')) {
                    // Find the slide containing this checkbox
                    const slide = checkbox.closest(this.options.slideSelector);
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
            
            // Style toggle if needed
            if (checkbox.hasAttribute('data-fc-toggle-style')) {
                this._styleToggle(checkbox);
            }
        });
    }
    
    /**
     * Style checkbox as a toggle switch
     * @param {HTMLElement} checkbox - Checkbox input
     * @private
     */
    _styleToggle(checkbox) {
        // Skip if already styled
        if (checkbox.closest('.fc-toggle-switch')) return;
        
        // Get parent label or create one
        let label = checkbox.closest('label');
        
        if (!label) {
            // Find label by for attribute
            if (checkbox.id) {
                label = this.formChippy.container.querySelector(`label[for="${checkbox.id}"]`);
            }
            
            // Create label if not found
            if (!label) {
                label = document.createElement('label');
                checkbox.parentNode.insertBefore(label, checkbox);
                label.appendChild(checkbox);
            }
        }
        
        // Style the label as a toggle switch
        label.classList.add('fc-toggle-switch');
        
        // Create toggle parts
        const toggle = document.createElement('span');
        toggle.className = 'fc-toggle-track';
        
        const handle = document.createElement('span');
        handle.className = 'fc-toggle-handle';
        
        // Get label text (if any)
        let labelText = '';
        Array.from(label.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                labelText += node.nodeValue.trim() + ' ';
            }
        });
        
        // Clear label and rebuild with toggle structure
        label.innerHTML = '';
        
        // Add checkbox back
        label.appendChild(checkbox);
        
        // Add toggle elements
        toggle.appendChild(handle);
        label.appendChild(toggle);
        
        // Add label text back if it existed
        if (labelText) {
            const textSpan = document.createElement('span');
            textSpan.className = 'fc-toggle-label-text';
            textSpan.textContent = labelText.trim();
            label.appendChild(textSpan);
        }
        
        // Add optional ON/OFF text
        if (checkbox.hasAttribute('data-fc-toggle-text')) {
            const onOffContainer = document.createElement('span');
            onOffContainer.className = 'fc-toggle-text';
            
            const onText = document.createElement('span');
            onText.className = 'fc-toggle-on';
            onText.textContent = checkbox.getAttribute('data-fc-toggle-on') || 'ON';
            
            const offText = document.createElement('span');
            offText.className = 'fc-toggle-off';
            offText.textContent = checkbox.getAttribute('data-fc-toggle-off') || 'OFF';
            
            onOffContainer.appendChild(onText);
            onOffContainer.appendChild(offText);
            toggle.appendChild(onOffContainer);
        }
        
        // Initial state
        this._updateToggleState(checkbox);
        
        // Update toggle state on change
        checkbox.addEventListener('change', () => {
            this._updateToggleState(checkbox);
        });
    }
    
    /**
     * Update toggle switch appearance based on checkbox state
     * @param {HTMLElement} checkbox - Checkbox input
     * @private
     */
    _updateToggleState(checkbox) {
        const label = checkbox.closest('.fc-toggle-switch');
        
        if (checkbox.checked) {
            label.classList.add('fc-checked');
        } else {
            label.classList.remove('fc-checked');
        }
    }
    
    /**
     * Create a group of checkboxes styled as option cards
     * @param {HTMLElement} container - Container element
     * @param {Array} options - Array of option objects {value, label, checked}
     */
    createOptionCards(container, options) {
        // Create card container
        const cardContainer = document.createElement('div');
        cardContainer.className = 'fc-option-cards';
        
        // Create cards for each option
        options.forEach(option => {
            const card = document.createElement('label');
            card.className = 'fc-option-card';
            
            // Create checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option.value;
            checkbox.className = 'fc-option-checkbox';
            if (option.name) checkbox.name = option.name;
            if (option.checked) checkbox.checked = true;
            
            // Add data-fc-input for form detection
            checkbox.setAttribute('data-fc-input', '');
            
            // Create card content
            const content = document.createElement('div');
            content.className = 'fc-card-content';
            
            // Add card label
            const label = document.createElement('span');
            label.className = 'fc-card-label';
            label.textContent = option.label;
            
            // Add card icon if provided
            if (option.icon) {
                const icon = document.createElement('span');
                icon.className = 'fc-card-icon';
                icon.innerHTML = option.icon;
                content.appendChild(icon);
            }
            
            content.appendChild(label);
            
            // Add checkbox marker
            const marker = document.createElement('span');
            marker.className = 'fc-card-marker';
            
            // Assemble card
            card.appendChild(checkbox);
            card.appendChild(content);
            card.appendChild(marker);
            
            // Add to container
            cardContainer.appendChild(card);
            
            // Initialize state
            if (option.checked) {
                card.classList.add('fc-selected');
            }
            
            // Update state on change
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    card.classList.add('fc-selected');
                } else {
                    card.classList.remove('fc-selected');
                }
            });
        });
        
        // Add to container
        container.appendChild(cardContainer);
    }
}


/**
 * File.js
 * Handles file upload inputs
 */

class FileInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.files = new Map(); // Store files by input id
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize file input handling
     * @private
     */
    _init() {
        // Find all file inputs
        const fileInputs = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[type="file"], input[type="file"][data-fc-file]`
        );
        
        // Add event listeners to each file input
        fileInputs.forEach(fileInput => {
            // Initialize file storage for this input
            this.files.set(fileInput.id || fileInput.name, new Map());
            
            // Style the file input
            this._styleFileInput(fileInput);
            
            // Handle change event
            fileInput.addEventListener('change', (e) => {
                this._handleFileSelection(fileInput, e);
            });
            
            // Handle drag and drop events if the input has data-fc-dropzone
            if (fileInput.hasAttribute('data-fc-dropzone')) {
                this._setupDropZone(fileInput);
            }
        });
    }
    
    /**
     * Style a file input with custom UI
     * @param {HTMLInputElement} fileInput - The file input element
     * @private
     */
    _styleFileInput(fileInput) {
        // Skip if already styled
        if (fileInput.closest('.fc-file-upload')) return;
        
        // Get file input configuration
        const multiple = fileInput.hasAttribute('multiple');
        const accept = fileInput.getAttribute('accept') || '';
        const maxSize = fileInput.getAttribute('data-fc-max-size') || '10'; // Default 10MB
        const maxFiles = fileInput.getAttribute('data-fc-max-files') || '5'; // Default 5 files
        const dropzone = fileInput.hasAttribute('data-fc-dropzone');
        const preview = fileInput.hasAttribute('data-fc-preview');
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-file-upload';
        if (dropzone) wrapper.classList.add('fc-dropzone');
        
        // Insert wrapper before file input
        fileInput.parentNode.insertBefore(wrapper, fileInput);
        
        // Create label and move file input inside
        const label = document.createElement('label');
        label.className = 'fc-file-label';
        label.setAttribute('for', fileInput.id || '');
        wrapper.appendChild(label);
        label.appendChild(fileInput);
        
        // Create button
        const button = document.createElement('span');
        button.className = 'fc-file-button';
        button.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"></path></svg>';
        button.innerHTML += '<span>Choose file' + (multiple ? 's' : '') + '</span>';
        label.appendChild(button);
        
        // Create file info area
        const infoArea = document.createElement('div');
        infoArea.className = 'fc-file-info';
        infoArea.textContent = multiple 
            ? 'No files chosen' 
            : 'No file chosen';
        wrapper.appendChild(infoArea);
        
        // Create help text with file type and size restrictions
        const helpText = document.createElement('div');
        helpText.className = 'fc-file-help';
        
        // Create file type text
        if (accept) {
            const acceptText = this._formatAcceptText(accept);
            const fileTypeText = document.createElement('div');
            fileTypeText.className = 'fc-file-type-text';
            fileTypeText.textContent = `Accepted file types: ${acceptText}`;
            helpText.appendChild(fileTypeText);
        }
        
        // Create max size text
        const maxSizeText = document.createElement('div');
        maxSizeText.className = 'fc-file-size-text';
        maxSizeText.textContent = `Maximum file size: ${maxSize}MB`;
        helpText.appendChild(maxSizeText);
        
        // Create max files text for multiple files
        if (multiple) {
            const maxFilesText = document.createElement('div');
            maxFilesText.className = 'fc-file-count-text';
            maxFilesText.textContent = `Maximum number of files: ${maxFiles}`;
            helpText.appendChild(maxFilesText);
        }
        
        wrapper.appendChild(helpText);
        
        // Create file preview container if preview is enabled
        if (preview) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'fc-file-preview-container';
            wrapper.appendChild(previewContainer);
        }
        
        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'fc-file-error';
        wrapper.appendChild(errorContainer);
    }
    
    /**
     * Format the accept attribute to human-readable text
     * @param {string} accept - The accept attribute value
     * @returns {string} - Formatted file types
     * @private
     */
    _formatAcceptText(accept) {
        if (!accept) return 'All files';
        
        const types = accept.split(',').map(type => {
            type = type.trim();
            
            // Handle image/*, video/*, etc.
            if (type.endsWith('/*')) {
                return type.replace('/*', ' files');
            }
            
            // Handle extensions like .jpg, .pdf
            if (type.startsWith('.')) {
                return type.toUpperCase();
            }
            
            // Handle specific mime types
            const mimeMap = {
                'image/jpeg': 'JPEG images',
                'image/png': 'PNG images',
                'image/gif': 'GIF images',
                'image/svg+xml': 'SVG images',
                'application/pdf': 'PDF documents',
                'application/msword': 'Word documents',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word documents',
                'application/vnd.ms-excel': 'Excel spreadsheets',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheets',
                'text/plain': 'Text files',
                'text/csv': 'CSV files'
            };
            
            return mimeMap[type] || type;
        });
        
        return types.join(', ');
    }
    
    /**
     * Handle file selection from the input
     * @param {HTMLInputElement} fileInput - The file input element
     * @param {Event} event - The change event
     * @private
     */
    _handleFileSelection(fileInput, event) {
        const files = event.target.files;
        const multiple = fileInput.hasAttribute('multiple');
        const maxSize = parseInt(fileInput.getAttribute('data-fc-max-size') || '10', 10) * 1024 * 1024; // Convert to bytes
        const maxFiles = parseInt(fileInput.getAttribute('data-fc-max-files') || '5', 10);
        const accept = fileInput.getAttribute('accept') || '';
        
        // Get UI elements
        const wrapper = fileInput.closest('.fc-file-upload');
        const infoArea = wrapper.querySelector('.fc-file-info');
        const errorContainer = wrapper.querySelector('.fc-file-error');
        const previewContainer = wrapper.querySelector('.fc-file-preview-container');
        
        // Clear previous errors
        this.formChippy.validation.clearInputError(fileInput);
        errorContainer.textContent = '';
        
        // Validate files
        let errorMessage = '';
        let validFiles = [];
        
        // Check max files
        if (multiple && files.length > maxFiles) {
            errorMessage = `Too many files. Maximum ${maxFiles} files allowed.`;
        }
        
        // Check each file
        if (!errorMessage) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Check file size
                if (file.size > maxSize) {
                    errorMessage = `File "${file.name}" exceeds the maximum size of ${maxSize / (1024 * 1024)}MB.`;
                    break;
                }
                
                // Check file type if accept is specified
                if (accept && !this._isFileTypeAccepted(file, accept)) {
                    errorMessage = `File "${file.name}" is not an accepted file type.`;
                    break;
                }
                
                validFiles.push(file);
            }
        }
        
        // Display error if any
        if (errorMessage) {
            this.formChippy.validation.showInputError(fileInput, errorMessage);
            errorContainer.textContent = errorMessage;
            return;
        }
        
        // Store valid files
        const fileMap = this.files.get(fileInput.id || fileInput.name);
        fileMap.clear(); // Clear previous files if not multiple
        
        validFiles.forEach(file => {
            fileMap.set(file.name, file);
        });
        
        // Update info area
        if (validFiles.length === 0) {
            infoArea.textContent = multiple ? 'No files chosen' : 'No file chosen';
        } else if (validFiles.length === 1) {
            infoArea.textContent = validFiles[0].name;
        } else {
            infoArea.textContent = `${validFiles.length} files selected`;
        }
        
        // Update preview if enabled
        if (previewContainer) {
            this._updateFilePreviews(previewContainer, validFiles, fileInput);
        }
    }
    
    /**
     * Check if a file type is accepted
     * @param {File} file - The file to check
     * @param {string} accept - The accept attribute value
     * @returns {boolean} - Whether the file type is accepted
     * @private
     */
    _isFileTypeAccepted(file, accept) {
        if (!accept) return true;
        
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type;
        const fileName = file.name;
        const fileExtension = '.' + fileName.split('.').pop().toLowerCase();
        
        return acceptedTypes.some(type => {
            // Check exact mime type match
            if (type === fileType) return true;
            
            // Check file extension
            if (type.startsWith('.') && fileExtension === type.toLowerCase()) return true;
            
            // Check wildcard mime type (e.g., image/*)
            if (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/'))) return true;
            
            return false;
        });
    }
    
    /**
     * Update file previews in the preview container
     * @param {HTMLElement} previewContainer - The preview container element
     * @param {File[]} files - Array of files to preview
     * @param {HTMLInputElement} fileInput - The file input element
     * @private
     */
    _updateFilePreviews(previewContainer, files, fileInput) {
        // Clear previous previews
        previewContainer.innerHTML = '';
        
        // Create previews for each file
        files.forEach(file => {
            const preview = document.createElement('div');
            preview.className = 'fc-file-preview';
            
            // Create preview content based on file type
            if (file.type.startsWith('image/')) {
                // Image preview
                const img = document.createElement('img');
                img.className = 'fc-file-image-preview';
                img.file = file;
                preview.appendChild(img);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                // Generic file icon preview
                const icon = document.createElement('div');
                icon.className = 'fc-file-icon-preview';
                
                // Set icon based on file type
                if (file.type.startsWith('application/pdf')) {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5v3zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75zM9 9.5h1v-1H9v1zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1zm11 5.5h1v-3h-1v3z" fill="currentColor"></path></svg>';
                } else if (file.type.startsWith('video/')) {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" fill="currentColor"></path></svg>';
                } else if (file.type.startsWith('audio/')) {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" fill="currentColor"></path></svg>';
                } else {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"></path></svg>';
                }
                
                preview.appendChild(icon);
            }
            
            // Create file name
            const name = document.createElement('div');
            name.className = 'fc-file-preview-name';
            name.textContent = file.name;
            preview.appendChild(name);
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'fc-file-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.type = 'button';
            removeBtn.setAttribute('aria-label', 'Remove file');
            
            // Handle remove button click
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove file from storage
                const fileMap = this.files.get(fileInput.id || fileInput.name);
                fileMap.delete(file.name);
                
                // Remove preview
                preview.remove();
                
                // Update info area
                const infoArea = fileInput.closest('.fc-file-upload').querySelector('.fc-file-info');
                const remainingFiles = fileMap.size;
                
                if (remainingFiles === 0) {
                    infoArea.textContent = fileInput.hasAttribute('multiple') ? 'No files chosen' : 'No file chosen';
                } else if (remainingFiles === 1) {
                    infoArea.textContent = Array.from(fileMap.values())[0].name;
                } else {
                    infoArea.textContent = `${remainingFiles} files selected`;
                }
                
                // Clear the file input
                fileInput.value = '';
            });
            
            preview.appendChild(removeBtn);
            previewContainer.appendChild(preview);
        });
    }
    
    /**
     * Set up drag and drop functionality for a file input
     * @param {HTMLInputElement} fileInput - The file input element
     * @private
     */
    _setupDropZone(fileInput) {
        const dropZone = fileInput.closest('.fc-dropzone');
        if (!dropZone) return;
        
        // Add instructional text
        const dropText = document.createElement('div');
        dropText.className = 'fc-drop-text';
        dropText.innerHTML = 'Drop files here or <span>browse</span>';
        
        // Add to the button area
        const button = dropZone.querySelector('.fc-file-button');
        if (button) {
            button.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"></path></svg>';
            button.appendChild(dropText);
        }
        
        // Handle drag events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('fc-dragover');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('fc-dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('fc-dragover');
            
            // Handle the dropped files
            if (e.dataTransfer.files.length) {
                // Set the files to the input and trigger change event
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }
    
    /**
     * Get all files for a specific file input
     * @param {string} inputId - The id or name of the file input
     * @returns {File[]} Array of files
     */
    getFiles(inputId) {
        const fileMap = this.files.get(inputId);
        return fileMap ? Array.from(fileMap.values()) : [];
    }
    
    /**
     * Create a new file upload input
     * @param {HTMLElement} container - The container to append the file input to
     * @param {object} config - Configuration options
     * @returns {HTMLInputElement} The created file input
     */
    createFileInput(container, config) {
        const {
            name,
            id = name,
            multiple = false,
            accept = '',
            maxSize = 10, // MB
            maxFiles = 5,
            required = false,
            dropzone = true,
            preview = true,
            label = 'Upload Files',
        } = config;
        
        // Create wrapper element
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-form-group';
        
        // Create label element if provided
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            wrapper.appendChild(labelEl);
        }
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = id;
        fileInput.name = name;
        fileInput.setAttribute('data-fc-input', '');
        fileInput.setAttribute('data-fc-file', '');
        
        // Set attributes based on config
        if (multiple) fileInput.setAttribute('multiple', '');
        if (accept) fileInput.setAttribute('accept', accept);
        if (maxSize) fileInput.setAttribute('data-fc-max-size', maxSize.toString());
        if (maxFiles) fileInput.setAttribute('data-fc-max-files', maxFiles.toString());
        if (required) {
            fileInput.setAttribute('required', '');
            fileInput.setAttribute('data-fc-required', '');
        }
        if (dropzone) fileInput.setAttribute('data-fc-dropzone', '');
        if (preview) fileInput.setAttribute('data-fc-preview', '');
        
        // Add to wrapper
        wrapper.appendChild(fileInput);
        
        // Add to container
        container.appendChild(wrapper);
        
        // Style the file input
        this._styleFileInput(fileInput);
        
        // Initialize file storage for this input
        this.files.set(id || name, new Map());
        
        // Set up event listeners
        fileInput.addEventListener('change', (e) => {
            this._handleFileSelection(fileInput, e);
        });
        
        // Set up dropzone if enabled
        if (dropzone) {
            this._setupDropZone(fileInput);
        }
        
        return fileInput;
    }
}


/**
 * Textarea.js
 * Handles textarea inputs with auto-resize and character counting
 */

class TextareaInput {
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


/**
 * Date.js
 * Handles date, time, and datetime inputs with enhanced UI
 */

class DateInput {
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


/**
 * FormChippy.js v1.5.3
 * A smooth, vertical scrolling multi-step form experience
 * Created for L&C Mortgage Finder
 *
 * New in v1.5.3:
 * - Fixed data persistence logic for standard radio button groups.
 * - Corrected data handling for inputs nested within radiofield elements.
 *
 * New in v1.5.2:
 * - Enhanced validation for immediate feedback on input/change
 * - Updated form data is now also stored in local storage as JSON
 *
 * New in v1.5.1:
 * - Refactored initialization and event handling
 *
 * New in v1.5.0:
 * - Introduced Debug module for enhanced troubleshooting
 * - Enhanced form validation system with hierarchical required/optional handling
 * - Added support for 'data-fc-required="false"' at multiple DOM levels (slide, content, field, etc.)
 * - Unified error handling with consistent application of error classes to content elements
 * - Improved debug logging throughout the validation process
 *
 * New in v1.4.1:
 * - Fixed bug where reset button didn't clear storage
 *
 * New in v1.4.0:
 * - Added data persistence options (sessionStorage, localStorage, none)
 * - Support for slides at any nesting level within the slide-list element
 * - Automatic filtering of slides with hidden ancestors (display:none)
 * - Improved slide detection regardless of DOM structure depth
 * - Enhanced debug information showing excluded slides and their status
 *
 * New in v1.3.0:
 * - Progress fraction indicator ("Step X of Y") integrated in core library
 * - Donut progress indicator for circular visualizations
 * - Enhanced progress tracking and visualization options
 *
 * New in v1.2.0:
 * - Percentage-based scroll positioning (e.g., data-fc-slide-position="25%")
 * - Improved overflow control to prevent scrolling after slide navigation
 *
 * @version     1.5.3
 * @license     MIT
 * @author      JP Dionisio
 * Copyright (c) 2025 JP Dionisio
 */

// Import core modules









// Import question types










window.FormChippy = class FormChippy {
    // Static property to hold all instances
    static instances = {}
   

    constructor(options = {}, formChippy) {
        // Default options
        this.options = {
            containerSelector: '[data-fc-container]',
            slideListSelector: '[data-fc-slide-list]',
            slideSelector: '[data-fc-slide]',
            contentSelector: '[data-fc-content]',
            inputSelector: '[data-fc-input]',
            buttonSelector: '[data-fc-button]',
            submitSelector: '[data-fc-submit]',
            progressSelector: '[data-fc-progress]',
            dotsSelector: '[data-fc-dots]',
            dotSelector: '[data-fc-dot]',
            activeClass: 'fc-slideactive',
            animationDelay: 800,
            useIntersectionObserver: false, // Disable auto-navigation by scrolling by default
            validateByDefault: true, // Whether to validate by default (can be overridden by data-fc-validate attribute)
            autoInitialize: true, // Whether to auto-initialize on load
            scrollPosition: 'center', // How to position active slides: 'start', 'center', 'end', 'nearest', or percentage (e.g., '25%')
            autoFocus: true, // Whether to auto-focus the first input in a slide after navigation
            skipAutoFocusOnMobile: true, // Whether to skip auto-focus on mobile devices
            ...options,
        }

        // State
        this.currentSlideIndex = 0
        this.slides = []
        this.dots = []
        this.isAnimating = false
        this.formData = {}
        this.eventHandlers = {} // Event handling system

        // Modules
        this.navigation = null
        this.validation = null
        this.progress = null
        this.donutProgress = null
        this.dynamicSlides = null
        this.inputActive = null
        this.debug = null
        this.persistence = null
        this.questionHandlers = {}

        // Initialize
        this._init()

        // Form Data
        this.formChippy = formChippy;
    }

    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @returns {FormChippy} - For chaining
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = []
        }
        this.eventHandlers[event].push(handler)
        return this
    }

    /**
     * Remove an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function (optional, if not provided, all handlers for event are removed)
     * @returns {FormChippy} - For chaining
     */
    off(event, handler) {
        if (!this.eventHandlers[event]) return this

        if (!handler) {
            delete this.eventHandlers[event]
            return this
        }

        this.eventHandlers[event] = this.eventHandlers[event].filter(
            (h) => h !== handler
        )
        return this
    }

    /**
     * Trigger an event
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @returns {FormChippy} - For chaining
     */
    trigger(event, data) {
        if (this.debug) {
            this.debug.info(`Event triggered: ${event}`, data)
        }

        if (!this.eventHandlers[event]) return this

        this.eventHandlers[event].forEach((handler) => {
            try {
                handler(data)
            } catch (error) {
                if (this.debug && this.debug.enabled) {
                    this.debug.error(
                        `Error in event handler for ${event}:`,
                        error
                    )
                } else {
                    console.error(
                        `[FormChippy] Error in event handler for ${event}:`,
                        error
                    )
                }
            }
        })

        return this
    }

    /**
     * Initialize FormChippy
     * @private
     */
    _init() {

        // Local Storage
console.log('--- Local Storage ---');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}:`, value);
}

// Session Storage
console.log('--- Session Storage ---');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  const value = sessionStorage.getItem(key);
  console.log(`${key}:`, value);
}
        // Get main elements
        this.container = document.querySelector(this.options.containerSelector)
        if (!this.container) {
            console.error('FormChippy: Container not found')
            return
        }

        this.formName =
            this.container.getAttribute('data-fc-container') || 'form'

        console.log(`FormChippy: Initializing form with name: ${this.formName}`)

        // Default to Typeform-like controlled navigation (no scrolling)
        // Only allow scrolling when explicitly enabled with data-fc-allow-scroll="true"
        this.allowScrolling =
            this.container.getAttribute('data-fc-allow-scroll') === 'true'

        // Create or find the slide list element
        this.slideList = this.container.querySelector(
            this.options.slideListSelector
        )
        if (!this.slideList) {
            // If no slide list exists, create one and move slides into it
            this.slideList = document.createElement('div')
            this.slideList.setAttribute('data-fc-slide-list', '')

            // Find all slides that are direct children of the container
            const directSlides = Array.from(
                this.container.querySelectorAll(
                    ':scope > ' + this.options.slideSelector
                )
            )

            // If direct slides exist, move them into the slide list
            if (directSlides.length > 0) {
                directSlides.forEach((slide) => {
                    this.slideList.appendChild(slide)
                })
                // Insert the slide list where the first slide was
                this.container.appendChild(this.slideList)
            } else {
                // No direct slides, first add the slide list to the container
                this.container.appendChild(this.slideList)
            }
        }

        // Get all slides within the slide list, including those at any depth
        // This ensures we can navigate between slides regardless of their nesting level
        const allSlides = Array.from(
            this.slideList.querySelectorAll(this.options.slideSelector)
        )

        // Filter out slides that are inside hidden containers (display: none)
        this.slides = allSlides.filter(
            (slide) => !this._hasHiddenAncestor(slide)
        )
        this.totalSlides = this.slides.length

        // Log any filtered slides for debugging
        if (allSlides.length !== this.slides.length) {
            console.info(
                `FormChippy: Filtered out ${
                    allSlides.length - this.slides.length
                } slides with hidden ancestors`
            )
        }

        // Store the parent structure for each slide to help with navigation
        this.slideParents = new Map()
        this.slides.forEach((slide) => {
            let parent = slide.parentElement
            // Check if the parent is a slide group
            if (parent && parent.matches('[data-fc-slide-group]')) {
                this.slideParents.set(slide, parent)
            }
        })

        // Get validation setting from data attribute (if present) or use the default
        const validateAttr = this.container.getAttribute('data-fc-validate')
        this.validationEnabled =
            validateAttr !== null
                ? validateAttr === 'true'
                : this.options.validateByDefault

        // Log validation state
        if (!this.validationEnabled) {
            console.info(
                'FormChippy: Validation is disabled via data-fc-validate attribute'
            )
        }

        if (this.totalSlides === 0) {
            console.error('FormChippy: No slides found')
            return
        }

        // Use querySelector within the container to ensure we get the correct elements
        this.progressContainer = this.container.querySelector(
            this.options.progressSelector
        )
        this.dotsContainer = this.container.querySelector(
            this.options.dotsSelector
        )

        // The actual progress bar fill element will be set by the Progress class later
        this.progressBar = null

        // Initialize modules
        this.debug = new Debug(this)
        this.persistence = new Persistence(this)
        this.validation = new Validation(this)
        this.navigation = new Navigation(this)
        this.progress = new Progress(this)
        this.donutProgress = new DonutProgress(this)
        this.dynamicSlides = new DynamicSlides(this)
        this.inputActive = new InputActive(this)

        // Ensure this instance is registered in the static instances collection
        if (!FormChippy.instances) {
            FormChippy.instances = {}
        }
        FormChippy.instances[this.formName] = this
        this.debug.info(`Registered form instance: ${this.formName}`)

        // Load saved form data from localStorage if available
        if (this.persistence && this.validation) {
            // Get the saved data - our persistence module will automatically handle
            // both old and new data formats and return just the form data portion
            const savedData = this.persistence.loadFormData(this.formName);
            
            //this.persistence.applySavedDataToAllForms(this.formName);

            if (savedData) {
                
                this.validation.formData = savedData
                this.debug.info(
                    `Loaded saved form data for form: ${this.formName}`,
                    savedData
                )

                // -- Apply FormData to fields
                data_applySavedFormData(savedData);

                // -- Remove any Loading Processing from Form
                adjustor_showElement('button-results', false);
                adjustor_showLoading('loader', false);
                adjustor_showLoading('buttons', true);
                

                // Trigger an event so extensions can react to the loaded data
                this.trigger('formDataLoaded', {
                    formName: this.formName,
                    formData: savedData,
                })

                // Also add timestamp info to the debug logs if available
                const fullData = this.persistence.loadFormData(
                    this.formName,
                    true
                )
                if (fullData && fullData.timestamp) {
                    const lastUpdated = new Date(fullData.timestamp)
                    this.debug.info(
                        `Form data was last saved on: ${lastUpdated.toLocaleString()}`
                    )
                }
            }
        }

        // Apply essential styles via JavaScript to ensure scrolling works without CSS dependencies
        this._applyCoreStyles()

        // Log initialization
        this.debug.info('FormChippy initializing', {
            container: this.container.id || 'no-id',
            slides: this.totalSlides,
            formName: this.formName,
        })

        // Initialize question handlers
        this.questionHandlers = {
            text: new TextInput(this),
            radio: new RadioInput(this),
            toggle: new ToggleInput(this),
            file: new FileInput(this),
            textarea: new TextareaInput(this),
            date: new DateInput(this),
        }

        // Generate slide IDs if not set
        this._generateSlideIds()

        // Set up form elements
        this.navigation.setupNavigation()
        this.progress.createProgressBar() // Create the progress bar with proper structure
        this.progress.createNavigationDots()
        this.progress.createProgressFraction() // Initialize the progress fraction indicator
        this.donutProgress.init() // Initialize the donut progress indicator if container exists

        // Apply no-scroll mode by default (Typeform style UX)
        // Only allow scrolling when explicitly requested
        if (!this.allowScrolling) {
            this._setupNoScrollMode()
        } else {
            this.debug.info(
                'Scroll navigation enabled: Users can navigate by scrolling'
            )
        }

        // Handle window resize
        window.addEventListener('resize', this._handleResize.bind(this))

        // Initialize the dynamic slides module
        this.dynamicSlides.init()

        // Initialize first slide and ensure it's properly active
        this._updateActiveSlide(0)

        // Explicitly add active class and setup tab navigation for first slide
        if (this.slides.length > 0) {
            const firstSlide = this.slides[0]
            firstSlide.classList.add(this.options.activeClass)

            // Ensure all elements in first slide have proper tabindex
            // This runs after _updateActiveSlide to ensure tab navigation works immediately on page load
            this._setupActiveSlideTabbing(firstSlide)

            // If there's a focusable element, highlight it visually (optional)
            const firstInput = firstSlide.querySelector(
                'input, select, textarea, button:not([data-fc-button-prev])'
            )
            if (firstInput) {
                // Don't auto-focus on mobile devices to avoid keyboard popping up immediately
                if (window.innerWidth > 768) {
                    setTimeout(() => firstInput.focus(), 100)
                }
            }

            this.debug.info(
                `First slide activated: ${firstSlide.getAttribute(
                    'data-fc-slide'
                )}`
            )
        }

        this.debug.info(`FormChippy initialized for form: ${this.formName}`)
    }

    /**
     * Generate unique IDs for slides if not already set
     * @private
     */
    _generateSlideIds() {
        this.slides.forEach((slide, index) => {
            if (
                !slide.getAttribute('data-fc-slide') ||
                slide.getAttribute('data-fc-slide') === ''
            ) {
                slide.setAttribute('data-fc-slide', `slide-${index + 1}`)
            }
        })
    }

    /**
     * Handle window resize
     * @private
     */
    _handleResize() {
        // Re-scroll to current slide to maintain correct positioning
        if (!this.isAnimating) {
            this.goToSlide(this.currentSlideIndex, false)
        }
    }

    /**
     * Check if an element or any of its ancestors has display:none
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} - True if element or any ancestor has display:none
     * @private
     */
    _hasHiddenAncestor(element) {
        let current = element

        // Check the element and all its ancestors up to the slide-list
        while (current && !current.hasAttribute('data-fc-slide-list')) {
            // Get computed style to check display property
            const style = window.getComputedStyle(current)

            if (style.display === 'none') {
                return true
            }

            current = current.parentElement
        }

        return false
    }

    /**
     * Apply core styles via JavaScript to ensure scrolling works without CSS dependencies
     * This method is called during initialization to set up essential styles
     * @private
     */
    _applyCoreStyles() {
        if (!this.slideList || !this.container) return

        // Apply container styles
        Object.assign(this.container.style, {
            position: 'relative',
            width: '100%',
        })

        // Apply slide list styles for scrolling behavior
        Object.assign(this.slideList.style, {
            width: '100%',
            overflowY: 'scroll', // Default to scrollable
            scrollBehavior: 'smooth', // For smooth scrolling
            position: 'relative',
        })

        // Apply basic styles to slides without hiding them
        this.slides.forEach((slide, index) => {
            // Apply base styles to all slides
            Object.assign(slide.style, {
                width: '100%',
                boxSizing: 'border-box',
                scrollMargin: '0',
            })

            // Set active class only for the first slide
            if (index === 0) {
                slide.classList.add(this.options.activeClass)
            } else {
                slide.classList.remove(this.options.activeClass)
            }

            // Apply only essential styles to content elements
            const contentElement = slide.querySelector('[data-fc-content]')
            if (contentElement) {
                Object.assign(contentElement.style, {
                    overflowY: 'visible',
                    maxHeight: '',
                })
            }
        })

        this.debug.info(
            'Enhanced core styles applied with improved slide visibility control'
        )
    }

    /**
     * Setup no-scroll mode for Typeform-like UX experience
     * - Disables internal form scrolling while allowing page to scroll underneath
     * - Users navigate only with buttons and dots
     * @private
     */
    _setupNoScrollMode() {
        if (!this.slideList) return

        // Directly modify the style to prevent scrolling inside the form
        this.slideList.style.overflowY = 'hidden'
        this.slideList.style.scrollBehavior = 'auto'
        this.slideList.style.scrollSnapType = 'none' // Disable snap points in no-scroll mode

        // Make sure the container doesn't trap scroll events
        if (this.container) {
            this.container.style.overflow = 'visible'
        }

        // Key mapping for navigation only when form is focused
        // (We're not preventing wheel or touch events to allow page scrolling)
        this.slideList.addEventListener('keydown', (e) => {
            // Only prevent default if the focus is within the slideList
            if (this.slideList.contains(document.activeElement)) {
                // Map keys to navigation actions
                if (['ArrowDown', 'PageDown'].includes(e.key)) {
                    e.preventDefault()
                    this.goToNextSlide()
                } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
                    e.preventDefault()
                    this.goToPrevSlide()
                }
            }
        })

        this.debug.info(
            'Typeform-style navigation enabled: Form prevents internal scrolling but allows page to scroll underneath'
        )
    }

    /**
     * Update active slide accessibility and tab order
     * Ensures proper tab navigation from inputs to navigation buttons
     * @param {number} index - Slide index
     * @param {boolean} afterAnimation - Whether this is called after animation completes
     * @private
     */
    _updateActiveSlide(index, afterAnimation = false) {
        // If we're not in after-animation mode, prevent updates during animation to avoid loops
        if (
            !afterAnimation &&
            this.isAnimating &&
            index !== this.currentSlideIndex
        ) {
            this.debug.info(
                `_updateActiveSlide: Skipping update during animation`,
                {
                    requestedIndex: index,
                    currentIndex: this.currentSlideIndex,
                }
            )
            return
        }

        // Log slide change
        const previousIndex = this.currentSlideIndex

        // Only log if there's an actual change (avoid noisy logs)
        if (previousIndex !== index) {
            this.debug.logSlideChange(previousIndex, index)
        }

        // IMPORTANT: We don't set currentSlideIndex here anymore
        // It's now set in goToSlide before calling this method

        // Only update accessibility and tab order if we're post-animation
        // This prevents screen readers from seeing tab changes during slide transitions
        if (afterAnimation) {
            // Set tabindex immediately after animation completes
            this.debug.info(
                `Setting tabindex attributes after animation completes`,
                {
                    currentIndex: index,
                    activeSlideId:
                        this.slides[index].getAttribute('data-fc-slide'),
                }
            )

            this.slides.forEach((slide, i) => {
                const isActive = i === index

                // Manage tab indices and focus for accessibility
                if (isActive) {
                    // Make all focusable elements in active slide reachable by tab
                    this._setupActiveSlideTabbing(slide)
                } else {
                    // Remove all inactive slide elements from tab order
                    const allElements = slide.querySelectorAll('*')
                    allElements.forEach((el) => {
                        if (el.getAttribute('tabindex') !== '-1') {
                            el.setAttribute('tabindex', '-1')
                        }
                    })
                }
            })
        }

        // Always update dots and progress (visual-only updates)
        this.progress.updateProgress(index)

        // Handle focus after slide animation, if auto-focus is enabled
        setTimeout(() => {
            // Check if auto-focus is enabled globally or specifically for this slide
            const slideAutoFocus =
                this.slides[index].getAttribute('data-fc-auto-focus')
            const shouldAutoFocus =
                slideAutoFocus !== null
                    ? slideAutoFocus === 'true'
                    : this.options.autoFocus

            // Skip auto-focus if disabled or on mobile devices (if configured to skip)
            const isMobile =
                window.innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent
                )

            if (
                !shouldAutoFocus ||
                (isMobile && this.options.skipAutoFocusOnMobile)
            ) {
                this.debug.info('Auto-focus skipped', {
                    isMobile,
                    autoFocusEnabled: shouldAutoFocus,
                    skipOnMobile: this.options.skipAutoFocusOnMobile,
                })
                return
            }

            // Find the most appropriate element to focus
            const activeSlide = this.slides[index]
            let elementToFocus

            // Try to find the first visible, enabled input
            const inputs = Array.from(
                activeSlide.querySelectorAll(
                    `${this.options.inputSelector}:not([type="hidden"]):not([disabled])`
                )
            )

            if (inputs.length > 0) {
                // Filter out elements that are already in the inputs or buttons arrays
                const visibleInputs = inputs.filter((input) => {
                    const style = window.getComputedStyle(input)
                    return (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden'
                    )
                })

                if (visibleInputs.length > 0) {
                    // Get the first visible input
                    elementToFocus = visibleInputs[0]

                    // For radio/checkbox groups, try to find the first unchecked one
                    if (['radio', 'checkbox'].includes(elementToFocus.type)) {
                        const uncheckedInput = visibleInputs.find(
                            (input) =>
                                !input.checked &&
                                input.type === elementToFocus.type
                        )
                        if (uncheckedInput) {
                            elementToFocus = uncheckedInput
                        }
                    }
                }
            }

            // If no appropriate input was found, try to focus the first button
            if (!elementToFocus) {
                const nextButton = activeSlide.querySelector(
                    '[data-fc-button="next"], [data-fc-button-next]'
                )
                if (nextButton) {
                    elementToFocus = nextButton
                }
            }

            // Apply focus if we found something to focus
            if (elementToFocus) {
                this.debug.info(`Auto-focusing element in slide ${index}`, {
                    elementType: elementToFocus.tagName,
                    elementId: elementToFocus.id || 'no-id',
                })
                elementToFocus.focus()
            }
        }, this.options.animationDelay)

        // Trigger slide change event
        const slideChangeEvent = new CustomEvent('formchippy:slideChange', {
            detail: {
                currentSlide: index + 1,
                totalSlides: this.totalSlides,
                slideId: this.slides[index].getAttribute('data-fc-slide'),
            },
            bubbles: true,
        })

        this.container.dispatchEvent(slideChangeEvent)

        // Trigger internal slideChanged event for modules like DonutProgress
        this.trigger('slideChanged', {
            currentSlideIndex: index,
            totalSlides: this.slides.length,
            slideId: this.slides[index].getAttribute('data-fc-slide'),
        })

        // Ensure tabindex focus trapping is updated on slide change
        this._setupActiveSlideTabbing(this.slides[index])
    }

    /**
     * Update only visual indicators without changing current slide
     * @param {number} index - Slide index to highlight visually
     * @private
     */
    _updateActiveVisuals(index) {
        // Only update the progress and dots, don't change the current slide
        this.progress.updateProgress(index)

        // Update active class on slides visually
        this.slides.forEach((slide, i) => {
            if (i === index) {
                slide.classList.add(this.options.activeClass)
            } else {
                slide.classList.remove(this.options.activeClass)
            }
        })
    }

    /**
     * Setup tab order for active slide elements
     * Ensures proper tab navigation from inputs to navigation buttons
     * @param {HTMLElement} slide - Active slide to setup tab navigation for
     * @private
     */
    _setupActiveSlideTabbing(slide) {
        // First gather all focusable elements in a logical order
        const inputs = Array.from(
            slide.querySelectorAll('input, select, textarea')
        )
        const buttons = Array.from(
            slide.querySelectorAll('button, [role="button"], [data-fc-button]')
        )
        const otherFocusables = Array.from(
            slide.querySelectorAll('[href], [tabindex]:not([tabindex="-1"])')
        )

        // Filter out elements that are already in the inputs or buttons arrays
        const uniqueOtherFocusables = otherFocusables.filter(
            (el) => !inputs.includes(el) && !buttons.includes(el)
        )

        // Create ordered array of all focusable elements
        // Order: inputs first, then other focusables, then buttons last
        const allFocusables = [...inputs, ...uniqueOtherFocusables, ...buttons]

        // First, clean up any previous event listeners from other slides
        this._cleanupTabEventListeners()

        // Make all focusable elements in this slide reachable by tab
        allFocusables.forEach((el) => {
            // Store original tabindex for restoration if needed
            if (!el._fcOriginalTabindex && el.hasAttribute('tabindex')) {
                el._fcOriginalTabindex = el.getAttribute('tabindex')
            }

            // Always set tabindex="0" for active slide elements to ensure keyboard accessibility
            el.setAttribute('tabindex', '0')
        })

        // Ensure all elements in inactive slides have tabindex="-1"
        this.slides.forEach((currentSlide) => {
            if (currentSlide !== slide) {
                const inactiveElements = currentSlide.querySelectorAll(
                    'input, select, textarea, button, [href], [tabindex]'
                )
                inactiveElements.forEach((el) => {
                    // Store original value if not already stored
                    if (
                        !el._fcOriginalTabindex &&
                        el.hasAttribute('tabindex')
                    ) {
                        el._fcOriginalTabindex = el.getAttribute('tabindex')
                    } else if (!el._fcOriginalTabindex) {
                        el._fcOriginalTabindex = '0'
                    }
                    // Set tabindex="-1" for all elements in inactive slides
                    el.setAttribute('tabindex', '-1')
                })
            }
        })

        // Log accessibility updates
        this.debug.info('Updated slide accessibility', {
            activeSlideIndex: this.currentSlideIndex,
            activeElements: allFocusables.length,
            activeSlideId: slide.getAttribute('data-fc-slide'),
        })

        // We don't need special tab behavior for the last input anymore
        // as the focus trap will handle this properly

        // Set focus trap within the active slide
        this._setupFocusTrap(slide, allFocusables)
    }

    /**
     * Clean up tab event listeners from previous slides
     * @private
     */
    _cleanupTabEventListeners() {
        // Clean up any previously stored handlers
        if (this._activeTabHandlers) {
            this._activeTabHandlers.forEach((item) => {
                if (item.element && item.handler) {
                    item.element.removeEventListener('keydown', item.handler)
                }
            })
            this._activeTabHandlers = []
        }

        // Clean up trap handlers
        if (this._activeTrapHandlers) {
            this._activeTrapHandlers.forEach((item) => {
                if (item.element && item.handler) {
                    item.element.removeEventListener('keydown', item.handler)
                }
            })
            this._activeTrapHandlers = []
        }
    }

    /**
     * Setup focus trap to keep focus within the active slide
     * @param {HTMLElement} slide - Active slide to trap focus within
     * @param {Array} focusableElements - Focusable elements in the slide
     * @private
     */
    _setupFocusTrap(slide, focusableElements) {
        if (focusableElements.length === 0) return

        const firstFocusable = focusableElements[0]
        const lastFocusable = focusableElements[focusableElements.length - 1]

        // Log focus trap setup for debugging
        this.debug.info('Setting up focus trap', {
            slideId: slide.getAttribute('data-fc-slide'),
            focusableCount: focusableElements.length,
            firstElement: firstFocusable.tagName,
            lastElement: lastFocusable.tagName,
        })

        // Initialize trap handlers array if needed
        this._activeTrapHandlers = this._activeTrapHandlers || []

        // Add event listener to the first focusable element
        const firstHandler = (e) => {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault()
                lastFocusable.focus()
                this.debug.info(
                    'Focus trap: wrapped from first to last element'
                )
            }
        }

        // Add event listener to the last focusable element
        const lastHandler = (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                firstFocusable.focus()
                this.debug.info(
                    'Focus trap: wrapped from last to first element'
                )
            }
        }

        // Store handlers for cleanup
        this._activeTrapHandlers.push(
            { element: firstFocusable, handler: firstHandler },
            { element: lastFocusable, handler: lastHandler }
        )

        // Add event listeners
        firstFocusable.addEventListener('keydown', firstHandler)
        lastFocusable.addEventListener('keydown', lastHandler)
    }

    // Simplified approach now handled directly in _applyCoreStyles

    /**
     * Go to a specific slide
     * @param {number} index - Slide index
     * @param {boolean} animate - Whether to animate the scroll
     * @public
     */
    goToSlide(index, animate = true) {
        // SIMPLIFIED NAVIGATION FLOW - Single source of truth approach

        // 1. VALIDATION: Check if index is valid
        if (index < 0 || index >= this.totalSlides) {
            this.debug.info(
                `Navigation rejected: Target index ${index} is out of bounds (0-${
                    this.totalSlides - 1
                })`
            )
            return
        }

        // Check if the target slide is within a slide group
        const targetSlide = this.slides[index]
        const slideGroup = this.slideParents.get(targetSlide)

        // If the slide is in a slide group, ensure the group is visible
        if (slideGroup) {
            // Check if the slide group is hidden
            if (
                slideGroup.style.display === 'none' ||
                slideGroup.classList.contains('fc-hidden')
            ) {
                this.debug.info(
                    `Target slide ${index} is in a hidden slide group. Making group visible.`
                )
                slideGroup.style.display = ''
                slideGroup.classList.remove('fc-hidden')
            }
        }

        // ===== ULTIMATE ANTI-JITTER SYSTEM =====
        // Initialize navigation state tracking if not already done
        if (!this._navigationState) {
            this._navigationState = {
                lastTime: 0,
                pending: null,
                debounceTime: 500, // Increased buffer to ensure animations complete
                inProgress: false,
                queue: [],
                maxQueueSize: 3,
            }
        }

        // 1. TIMING GUARD: Calculate time since last navigation for jitter prevention
        const now = Date.now()
        const timeSinceLastNav = now - this._navigationState.lastTime

        // 2. CLEAR PENDING: Cancel any pending (not yet executed) navigation attempts
        if (this._navigationState.pending) {
            clearTimeout(this._navigationState.pending)
            this._navigationState.pending = null
        }

        // 3. DUPLICATE/JITTER CHECK: Block navigation if:
        //    - We're already navigating AND
        //    - This request came too soon after previous one AND
        //    - We're trying to navigate to a different slide than current target in queue
        if (
            this.isAnimating &&
            timeSinceLastNav < this._navigationState.debounceTime
        ) {
            // Add to queue for extremely rapid clicking (optional - improves UX)
            if (
                this._navigationState.queue.length <
                    this._navigationState.maxQueueSize &&
                !this._navigationState.queue.includes(index)
            ) {
                this._navigationState.queue.push(index)
                this.debug.info(
                    `JITTER PREVENTION: Navigation to slide ${index} queued. Too soon after previous navigation: ${timeSinceLastNav}ms`
                )

                // Schedule this navigation for later when animations are done
                this._navigationState.pending = setTimeout(() => {
                    const nextIndex = this._navigationState.queue.shift()
                    if (
                        nextIndex !== undefined &&
                        nextIndex !== this.currentSlideIndex
                    ) {
                        this.debug.info(
                            `QUEUED NAVIGATION: Now processing navigation to slide ${nextIndex}`
                        )
                        this.goToSlide(nextIndex, true) // Force parameter to bypass jitter check
                    }
                }, this._navigationState.debounceTime)
            }

            // Skip immediate navigation attempt
            return
        }

        // Update navigation timestamp and state
        this._navigationState.lastTime = now
        this._navigationState.inProgress = true

        // Skip if already on this slide (optimization)
        if (index === this.currentSlideIndex && !this.isAnimating) {
            this.debug.info(`Navigation skipped: Already on slide ${index}`)
            return
        }

        // Set animation flag to block other navigation attempts
        this.isAnimating = true

        // Record slide info and indexes
        const targetSlideId = this.slides[index].getAttribute('data-fc-slide')
        const oldIndex = this.currentSlideIndex

        // Log navigation start with additional debugging info
        this.debug.info(
            `NAVIGATION START: ${oldIndex} → ${index} (${targetSlideId})`,
            {
                animate,
                timeSinceLastNav,
            }
        )

        // === CRITICAL: Update slide position tracking as single source of truth ===
        // Initialize slide position tracker if not yet done
        if (!this._slidePositionTracker) {
            this._slidePositionTracker = {
                currentIndex: 0,
                maxVisitedIndex: 0, // Track the furthest slide user has visited
                history: [0], // Full navigation history
                get progressPosition() {
                    // Progress is based on current position relative to max form length
                    return this.currentIndex
                },
            }
        }

        // Update the position tracker with the new index
        this._slidePositionTracker.currentIndex = index
        this._slidePositionTracker.history.push(index)

        // Update max position for progress calculation
        if (index > this._slidePositionTracker.maxVisitedIndex) {
            this._slidePositionTracker.maxVisitedIndex = index
        }

        // Update current index immediately to prevent race conditions
        this.currentSlideIndex = index

        // Group all DOM updates in a single animation frame for better performance
        requestAnimationFrame(() => {
            // 1. Update slide classes
            this.slides.forEach((slide, i) => {
                slide.classList.toggle(this.options.activeClass, i === index)
            })

            // 2. Update UI indicators using the slide position tracker as source of truth
            const progressPos = this._slidePositionTracker
                ? this._slidePositionTracker.currentIndex
                : index

            // Use the position tracker to update all UI components
            this.progress.updateProgress(progressPos)
            this.navigation.updateSlideCounter(progressPos)
            this.navigation.updateButtonStates(index) // Explicitly update button states

            // Only update visual indicators during transition, not tabindex
            // Tabindex will be updated after animation completes
            this._updateActiveVisuals(index)

            // 3. Schedule scrolling in next frame for smoother animation
            requestAnimationFrame(() => {
                const targetSlide = this.slides[index]

                // Check for slide-specific position override
                let scrollPosition = targetSlide.getAttribute(
                    'data-fc-slide-position'
                )
                let percentageMatch = false
                let percentageValue = 0

                // If no slide-specific position, use the global default
                if (!scrollPosition) {
                    scrollPosition = this.options.scrollPosition || 'center'
                }

                // Check if scrollPosition is a percentage value
                if (scrollPosition && scrollPosition.endsWith('%')) {
                    percentageMatch = true
                    percentageValue = parseFloat(scrollPosition) / 100
                    // Ensure value is between 0 and 1
                    percentageValue = Math.max(0, Math.min(1, percentageValue))
                    this.debug.info(
                        `Using percentage scroll position: ${scrollPosition} (${
                            percentageValue * 100
                        }% from top)`
                    )
                }

                // Smart default: Use 'start' position if slide height is larger than visible area
                if (
                    !percentageMatch &&
                    (scrollPosition === 'center' || scrollPosition === 'end')
                ) {
                    // Get the slide and container dimensions
                    const slideHeight = targetSlide.offsetHeight

                    // Calculate the inner content height of the slide list (accounting for padding)
                    const slideListStyles = window.getComputedStyle(
                        this.slideList
                    )
                    const paddingTop =
                        parseInt(slideListStyles.paddingTop, 10) || 0
                    const paddingBottom =
                        parseInt(slideListStyles.paddingBottom, 10) || 0
                    const containerHeight = this.slideList.offsetHeight
                    const contentHeight =
                        containerHeight - paddingTop - paddingBottom

                    // If slide is taller than available content height, ALWAYS default to 'start' for scrollable content
                    if (slideHeight > contentHeight * 0.9) {
                        // Using 90% as threshold to ensure we catch most cases
                        this.debug.info(
                            `Large slide detected (${slideHeight}px > available content height ${contentHeight}px). Using 'start' position for better scrolling`
                        )
                        scrollPosition = 'start'

                        // We no longer enable scrolling for large slides
                        // The slide content itself can scroll if needed, but the container shouldn't
                    }
                }

                // TypeForm-style approach with pure JavaScript control of scrolling
                // No CSS dependencies - all styling is applied through JavaScript

                // Simplified approach - no slide size differentiation
                const contentElement =
                    targetSlide.querySelector('[data-fc-content]')

                // Apply essential slide list styles for scrolling
                // Start with scroll enabled to allow the scrolling operation to work
                Object.assign(this.slideList.style, {
                    width: '100%',
                    overflowY: 'scroll', // Default to scrollable
                    scrollBehavior: animate ? 'smooth' : 'auto',
                })

                // Only manage the active class on slides without hiding others
                this.slides.forEach((slide) => {
                    // Apply only essential styles to content elements
                    const slideContent =
                        slide.querySelector('[data-fc-content]')
                    if (slideContent) {
                        // Reset only overflow properties
                        Object.assign(slideContent.style, {
                            overflow: '',
                            maxHeight: '',
                        })
                    }

                    if (slide !== targetSlide) {
                        // Only remove active class, don't hide slides
                        slide.classList.remove(this.options.activeClass)
                    }
                })

                // Mark target slide as active without hiding others
                targetSlide.classList.add(this.options.activeClass)

                // Make target slide active - no additional styling
                targetSlide.classList.add(this.options.activeClass)

                // Focus first focusable element in the slide if appropriate
                const firstFocusable = targetSlide.querySelector(
                    'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
                )
                if (
                    firstFocusable &&
                    !this.isAnimating &&
                    window.innerWidth > 768
                ) {
                    setTimeout(
                        () => {
                            firstFocusable.focus()
                        },
                        animate ? this.options.animationDelay : 0
                    )
                }

                // No scroll handlers to clean up

                // Apply scroll behavior to go to the target slide
                if (percentageMatch) {
                    // Manual percentage-based scrolling
                    const container = this.slideList
                    const targetRect = targetSlide.getBoundingClientRect()
                    const containerRect = container.getBoundingClientRect()

                    // Calculate the scroll position using the percentage
                    // The percentage represents how far down from the top the slide should be
                    const containerHeight = container.clientHeight
                    const targetOffset = targetSlide.offsetTop
                    const targetHeight = targetSlide.offsetHeight

                    // Calculate the scroll position based on percentage from top
                    const scrollY =
                        targetOffset -
                        containerHeight * percentageValue +
                        targetHeight * percentageValue

                    // Perform the scroll with desired behavior
                    container.scrollTo({
                        top: scrollY,
                        behavior: animate ? 'smooth' : 'auto',
                    })

                    // After scrolling, set overflow-y to hidden (adding a timeout to ensure scroll completes)
                    setTimeout(
                        () => {
                            this.slideList.style.overflowY = 'hidden'
                        },
                        animate ? 300 : 0
                    )

                    this.debug.info(
                        `Percentage scrolling: ${
                            percentageValue * 100
                        }% from top, scrollY: ${scrollY}px`
                    )
                } else {
                    // Standard scrollIntoView for predefined positions
                    targetSlide.scrollIntoView({
                        behavior: animate ? 'smooth' : 'auto',
                        block: scrollPosition, // Options: 'start', 'center', 'end', 'nearest'
                    })

                    // After scrolling, set overflow-y to hidden (adding a timeout to ensure scroll completes)
                    setTimeout(
                        () => {
                            this.slideList.style.overflowY = 'hidden'
                        },
                        animate ? 300 : 0
                    )
                }

                // Ensure content elements have proper overflow
                if (contentElement) {
                    // Only set overflow properties to ensure content displays properly
                    Object.assign(contentElement.style, {
                        overflowY: 'visible', // No scroll restriction
                        maxHeight: '', // No height restriction
                    })
                }

                // Calculate appropriate cleanup delay
                const animationDuration = animate
                    ? this.options.animationDelay + 50
                    : 50

                // Schedule cleanup after animation completes with enhanced state handling
                this._navigationState.pending = setTimeout(() => {
                    // Reset animation flags
                    this.isAnimating = false
                    this._navigationState.inProgress = false

                    // Log completion for debugging
                    this.debug.info(
                        `NAVIGATION COMPLETE: ${oldIndex} → ${index} (${targetSlideId})`
                    )

                    // Now that animation is complete, update tabindex attributes
                    // This ensures screen readers only see the final state
                    this._updateActiveSlide(index, true) // true = after animation complete

                    // Trigger completion event
                    this.trigger('navigationComplete', {
                        fromIndex: oldIndex,
                        toIndex: index,
                        slideId: targetSlideId,
                    })

                   // Last Slide - Submit the Form Data to API
                   if(targetSlideId === 'summary'){
                        submitProducts(this.persistence.loadFormData(this.formName))
                   }

                    // Force button state update after animation completes
                    this.navigation.updateButtonStates(index)

                    // Process next navigation in queue if any
                    if (this._navigationState.queue.length > 0) {
                        const nextIndex = this._navigationState.queue.shift()
                        if (
                            nextIndex !== undefined &&
                            nextIndex !== this.currentSlideIndex
                        ) {
                            // Wait a tiny bit before starting next navigation for smoother experience
                            setTimeout(() => {
                                this.debug.info(
                                    `PROCESSING QUEUED NAVIGATION to slide ${nextIndex}`
                                )
                                this.goToSlide(nextIndex, true)
                            }, 50)
                        }
                    }
                }, animationDuration)
            })
        })
    }

    /**
     * Go to the next slide
     * @public
     */
    next() {
        // Use the position tracker for current position if available
        const tracker = this._slidePositionTracker
        const currentIndex = tracker
            ? tracker.currentIndex
            : this.currentSlideIndex

        if (currentIndex < this.totalSlides - 1) {
            // Get the current slide element
            const currentSlide = this.slides[currentIndex]

            // Log the navigation attempt with source of truth
            const slideId = currentSlide.getAttribute('data-fc-slide')
            this.debug.info(`Next() method called from slide ${slideId}`, {
                validationEnabled: this.validationEnabled,
                currentIndex: currentIndex,
                targetIndex: currentIndex + 1,
                trackerExists: !!tracker,
                trackerCurrentIndex: tracker ? tracker.currentIndex : null,
                formCurrentIndex: this.currentSlideIndex,
            })

            // Check validation only if enabled
            if (
                !this.validationEnabled ||
                this.validation.validateSlide(currentSlide)
            ) {
                // Calculate the exact next index to prevent any confusion
                const nextIndex = currentIndex + 1
                this.debug.info(
                    `Next: Navigating from ${currentIndex} to ${nextIndex}`
                )
                this.goToSlide(nextIndex)
            } else {
                this.debug.info(
                    'Navigation blocked: Validation failed and validation is enabled'
                )
            }
        } else {
            this.debug.info(
                `Next: Already at last slide (index ${currentIndex}), cannot go further`
            )
        }
    }

    /**
     * Go to the previous slide
     * @public
     */
    prev() {
        // Use the position tracker for current position if available
        const tracker = this._slidePositionTracker
        const currentIndex = tracker
            ? tracker.currentIndex
            : this.currentSlideIndex

        if (currentIndex > 0) {
            const currentSlide = this.slides[currentIndex]

            // Calculate the exact previous index
            const prevIndex = currentIndex - 1

            // Log the navigation attempt with source of truth
            const slideId = currentSlide.getAttribute('data-fc-slide')
            if(slideId !== 'summary'){
                adjustor_showElement('button-results', false);
            }
            this.debug.info(`Prev() method called from slide ${slideId}`, {
                currentIndex: currentIndex,
                targetIndex: prevIndex,
                trackerExists: !!tracker,
                trackerCurrentIndex: tracker ? tracker.currentIndex : null,
                formCurrentIndex: this.currentSlideIndex,
            })

            // Previous navigation is always allowed regardless of validation
            this.debug.info(
                `Prev: Navigating from ${currentIndex} to ${prevIndex}`
            )
            this.goToSlide(prevIndex)
        } else {
            this.debug.info(
                `Prev: Already at first slide (index ${currentIndex}), cannot go back`
            )
        }
    }

    /**
     * Get the current slide index
     * @returns {number} - Current slide index (0-based)
     * @public
     */
    getCurrentSlide() {
        return this.currentSlideIndex
    }

    /**
     * Get the total number of slides
     * @returns {number} - Total number of slides
     * @public
     */
    getTotalSlides() {
        return this.totalSlides
    }

    /**
     * Check if a slide is valid (all required fields filled)
     * @param {number} index - Slide index to check
     * @returns {boolean} - True if valid, false if not
     * @public
     */
    isSlideValid(index) {
        if (index < 0 || index >= this.totalSlides) {
            return false
        }

        return this.validation.validateSlide(this.slides[index])
    }

    /**
     * Reset the form to its initial state
     * @public
     */
    reset() {
        // Clear all inputs
        const inputs = this.container.querySelectorAll(
            this.options.inputSelector
        )
        inputs.forEach((input) => {
            input.value = ''
            this.validation.clearInputError(input)
        })

        // Go to first slide
        this.goToSlide(0)

        // Reset form data
        this.formData = {}

        // Trigger reset event
        const resetEvent = new CustomEvent('formchippy:reset', {
            bubbles: true,
        })

        this.container.dispatchEvent(resetEvent)
    }

    /**
     * Update options after initialization
     * @param {Object} options - New options
     * @public
     */
    updateOptions(options = {}) {
        this.options = {
            ...this.options,
            ...options,
        }
    }

    /**
     * Destroy the FormChippy instance
     * @public
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this._handleResize.bind(this))

        // Cleanup modules
        this.navigation.destroy()
        this.progress.destroy()

        // Remove classes
        this.slides.forEach((slide) => {
            slide.classList.remove(this.options.activeClass)
        })

        // Trigger destroy event
        const destroyEvent = new CustomEvent('formchippy:destroy', {
            bubbles: true,
        })

        this.container.dispatchEvent(destroyEvent)

        console.log(`FormChippy destroyed for form: ${this.formName}`)
    }
}

// Store instances for access
FormChippy.instances = {}

// --- Helper Functions (defined outside class) ---

/**
 * Get instance by form name
 * @param {string} formName - Name of the form
 * @returns {FormChippy|null} FormChippy instance or null if not found
 */
const getInstance = (formName) => {
    return FormChippy.instances[formName] || null
}

// Helper function to convert kebab-case to camelCase
const kebabToCamelCase = (str) => {
    return str.replace(/-([a-z])/g, (match, char) => char.toUpperCase())
}

/**
 * Helper function to directly update the global forms object
 */
const __updateGlobalFormData = () => {
    // Skip if no window or FormChippy
    if (typeof window === 'undefined' || !window.FormChippy) return

    console.log('FormChippy: Updating global form data...')

    // Populate forms with all current instances and their form data
    window.FormChippy.forms = {}

    // Get all registered instances from static property
    const allInstances = FormChippy.instances || {}
    console.log(
        'FormChippy: Found registered instances:',
        Object.keys(allInstances)
    )

    for (const name in allInstances) {
        if (Object.hasOwnProperty.call(allInstances, name)) {
            const instance = allInstances[name]
            const camelCaseName = kebabToCamelCase(name)

            // Get form data directly from the instance
            const formData =
                typeof instance.getFormData === 'function'
                    ? instance.getFormData()
                    : { error: 'getFormData not available' }

            // Add to global forms object
            window.FormChippy.forms[camelCaseName] = {
                instance: instance,
                formData: formData,
            }

            console.log(
                `FormChippy: Added form to global FormChippy.forms: ${camelCaseName}`
            )
            if (instance.debug)
                instance.debug.log(
                    'Added form to global FormChippy.forms:',
                    camelCaseName
                )
        }
    }
}


/**
 * Create a new instance manually
 * @param {Object} options - FormChippy options
 * @returns {FormChippy} New FormChippy instance
 */
const create = (options) => {
    const instance = new FormChippy(options)
    const containerName = instance.formName || `fc_instance_${Date.now()}`
    if (!FormChippy.instances) {
        FormChippy.instances = {}
    }
    FormChippy.instances[containerName] = instance // Register instance in static list
    if (instance.debug)
        instance.debug.log('Instance created and registered:', containerName)

    // Dispatch init event for manually created instances too
    const initEvent = new CustomEvent('formchippy:init', {
        detail: { name: containerName, instance: instance },
        bubbles: true,
        cancelable: true,
    })
    ;(instance.container || document).dispatchEvent(initEvent)

    // Update global forms object
    __updateGlobalFormData()

    return instance
}



/**
 * Initialize all FormChippy instances in the document based on data attributes
 * This can be called manually if the DOM is dynamically loaded
 */
const initAll = () => {

    const containers = document.querySelectorAll('[data-fc-container]')
    // Ensure the static instances object exists on the class
    if (!FormChippy.instances) {
        FormChippy.instances = {}
    }

    containers.forEach((container) => {
        const containerName = container.getAttribute('data-fc-container')
        // Check if an instance for this container name already exists
        if (!FormChippy.instances[containerName]) {
            // Retrieve options from data attributes
            const options = {}
            // Make sure prototype options exist before iterating
            const defaultOptions = FormChippy.prototype?.options || {}
            for (const key in defaultOptions) {
                const dataAttr = `data-fc-${key
                    .replace(/([A-Z])/g, '-$1')
                    .toLowerCase()}`
                if (container.hasAttribute(dataAttr)) {
                    let value = container.getAttribute(dataAttr)
                    // Basic type conversion (boolean, number)
                    if (value === 'true') value = true
                    else if (value === 'false') value = false
                    else if (!isNaN(value) && value.trim() !== '')
                        value = Number(value)
                    options[key] = value
                }
            }

            // Ensure the container itself is passed
            options.containerElement = container

            // Create and register the instance
            const instance = new FormChippy(options)
            const instanceName =
                instance.formName || `fc_instance_${Date.now()}`
            if (!FormChippy.instances[instanceName]) {
                FormChippy.instances[instanceName] = instance
                if (instance.debug)
                    instance.debug.log(
                        'Instance auto-initialized and registered:',
                        instanceName
                    )
                // Dispatch init event
                const initEvent = new CustomEvent('formchippy:init', {
                    detail: { name: instanceName, instance: instance },
                    bubbles: true,
                    cancelable: true,
                })
                container.dispatchEvent(initEvent)
            } else if (FormChippy.instances[instanceName] !== instance) {
                if (instance.debug)
                    instance.debug.warn(
                        'Instance already registered with this name during initAll:',
                        instanceName
                    )
            }
        } else {
            const existingInstance = FormChippy.instances[containerName]
            if (existingInstance && existingInstance.debug) {
                existingInstance.debug.log(
                    'Skipping already registered container during initAll:',
                    containerName
                )
            }
        }
    })

    // Update global forms object after all instances are initialized
    __updateGlobalFormData()
}

// --- Global Assignment ---

// Assign helpers and class to window.FormChippy
if (typeof window !== 'undefined') {
    // Initialize the global FormChippy object
    window.FormChippy = {
        Class: FormChippy, // Expose the class constructor
        forms: {}, // Object to hold all forms with camelCase keys
        getInstance: getInstance,
        create: create,
        initAll: initAll,
        refreshFormData: __updateGlobalFormData,
    }

    // Debug helper function to manually inspect instances
    window.FormChippy.debugInstances = function () {
        console.log('FormChippy Instances:', Object.keys(FormChippy.instances))
        console.log('FormChippy Forms:', Object.keys(window.FormChippy.forms))
        return {
            instances: FormChippy.instances,
            forms: window.FormChippy.forms,
        }
    }

    // -------------------------------------------------------------------------
    // Listen directly for formchippy:init events to capture forms as they initialize
    // This is the most reliable way to catch forms being created
    // -------------------------------------------------------------------------
    document.addEventListener('formchippy:init', function (event) {
        if (!event.detail || !event.detail.name || !event.detail.instance)
            return

        const formName = event.detail.name
        const instance = event.detail.instance

        // Convert kebab-case (form-name) to camelCase (formName)
        const camelName = formName.replace(/-([a-z])/g, (_, char) =>
            char.toUpperCase()
        )

        // Add to the global forms object
        window.FormChippy.forms[camelName] = {
            instance: instance,
            formData: instance.getFormData(),
        }

        // Also set up a form data observer if the instance has a formDataChanged event
        if (instance.on && typeof instance.on === 'function') {
            // Listen for form data changes and update the global object
            instance.on('formDataChanged', function () {
                window.FormChippy.forms[camelName].formData =
                    instance.getFormData()
            })
        }

        // Debug message if debug is enabled on this instance
        if (instance.debug) {
            instance.debug.log(
                `Form '${formName}' added to global window.FormChippy.forms as '${camelName}'`
            )
        }
    })

    // Auto-initialize on DOM load if the default setting is true
    // Check the default option value from an instance's perspective
    const tempOptions = new FormChippy({ autoInitialize: false }) // Create temp instance to read default
    if (tempOptions.options.autoInitialize !== false) {
        // Check if default wasn't overridden to false
        if (document.readyState === 'loading') {
            document.addEventListener(
                'DOMContentLoaded',
                window.FormChippy.initAll
            )
        } else {
            window.FormChippy.initAll() // Initialize immediately if already loaded
        }
    }
}

// Export the FormChippy class as the default for module usage
// Export helpers for potential module usage as well
export { getInstance, create, initAll }



  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    new FormChippy();
  });
})();