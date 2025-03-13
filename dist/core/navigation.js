/**
 * Navigation.js
 * Handles navigation between form slides
 */

export class Navigation {
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
        const activeSlide = this.formChippy.container.querySelector(`[data-fc-slide].${activeClass}`);
        
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
    }
}
