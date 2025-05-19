/**
 * FormChippy.js v1.0.0
 * A smooth, vertical scrolling multi-step form experience
 * Created for L&C Mortgage Finder
 *
 * @license MIT
 * @author JP
 */

;(function () {
    'use strict'

    // Main FormChippy class
    class FormChippy {
        constructor(options = {}) {
            // Default options
            this.options = {
                containerSelector: '[data-fc-container]',
                slideSelector: '[data-fc-slide]',
                contentSelector: '[data-fc-content]',
                inputSelector: '[data-fc-input]',
                buttonSelector: '[data-fc-button]',
                submitSelector: '[data-fc-submit]',
                progressSelector: '[data-fc-progress]',
                dotsSelector: '[data-fc-dots]',
                dotSelector: '[data-fc-dot]',
                activeClass: 'active',
                animationDelay: 800,
                ...options,
            }

            // State
            this.currentSlideIndex = 0
            this.slides = []
            this.dots = []
            this.isAnimating = false

            // Initialize
            this._init()
        }

        /**
         * Initialize FormChippy
         * @private
         */
        _init() {
            // Get main elements
            this.container = document.querySelector(
                this.options.containerSelector
            )
            if (!this.container) {
                console.error('FormChippy: Container not found')
                return
            }

            this.formName =
                this.container.getAttribute('data-fc-container') || 'form'
            this.slides = Array.from(
                document.querySelectorAll(this.options.slideSelector)
            )
            this.totalSlides = this.slides.length

            if (this.totalSlides === 0) {
                console.error('FormChippy: No slides found')
                return
            }

            this.progressBar = document.querySelector(
                this.options.progressSelector
            )
            this.dotsContainer = document.querySelector(
                this.options.dotsSelector
            )

            // Generate slide IDs if not set
            this._generateSlideIds()

            // Create navigation dots
            this._createNavigationDots()

            // Set up form buttons
            this._setupButtons()

            // Set up keyboard navigation
            this._setupKeyboardNavigation()

            // Set up intersection observer
            this._setupIntersectionObserver()

            // Handle window resize
            window.addEventListener('resize', this._handleResize.bind(this))

            // Initialize first slide
            this._updateActiveSlide(0)

            console.log(`FormChippy initialized for form: ${this.formName}`)
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
         * Create navigation dots
         * @private
         */
        _createNavigationDots() {
            if (!this.dotsContainer) return

            // Clear existing dots
            this.dotsContainer.innerHTML = ''

            // Create dots for each slide
            this.slides.forEach((_, index) => {
                const dot = document.createElement('div')
                dot.setAttribute('data-fc-dot', '')
                dot.setAttribute('data-index', index)
                dot.setAttribute('role', 'button')
                dot.setAttribute('tabindex', '0')
                dot.setAttribute('aria-label', `Go to slide ${index + 1}`)

                // Add click event
                dot.addEventListener('click', () => this.goToSlide(index))

                // Add to container
                this.dotsContainer.appendChild(dot)
            })

            // Store dots for later use
            this.dots = Array.from(
                document.querySelectorAll(this.options.dotSelector)
            )
        }

        /**
         * Set up buttons for navigation
         * @private
         */
        _setupButtons() {
            // Next buttons
            const nextButtons = document.querySelectorAll(
                `${this.options.buttonSelector}:not(${this.options.submitSelector})`
            )
            nextButtons.forEach((button) => {
                button.addEventListener('click', (e) => {
                    e.preventDefault()

                    // Get current slide
                    const currentSlide = this.slides[this.currentSlideIndex]

                    // Validate inputs
                    if (this._validateSlide(currentSlide)) {
                        this.goToSlide(this.currentSlideIndex + 1)
                    }
                })
            })

            // Submit button
            const submitButton = document.querySelector(
                this.options.submitSelector
            )
            if (submitButton) {
                submitButton.addEventListener('click', (e) => {
                    e.preventDefault()
                    this._handleSubmit()
                })
            }
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
                        const button = this.slides[
                            this.currentSlideIndex
                        ].querySelector(this.options.buttonSelector)
                        if (button) button.click()
                        e.preventDefault()
                    }
                    return
                }

                // Navigation keys
                switch (e.key) {
                    case 'ArrowDown':
                    case 'PageDown':
                        if (this.currentSlideIndex < this.totalSlides - 1) {
                            this.goToSlide(this.currentSlideIndex + 1)
                            e.preventDefault()
                        }
                        break

                    case 'ArrowUp':
                    case 'PageUp':
                        if (this.currentSlideIndex > 0) {
                            this.goToSlide(this.currentSlideIndex - 1)
                            e.preventDefault()
                        }
                        break

                    case 'Home':
                        this.goToSlide(0)
                        e.preventDefault()
                        break

                    case 'End':
                        this.goToSlide(this.totalSlides - 1)
                        e.preventDefault()
                        break
                }
            })
        }

        /**
         * Set up intersection observer to detect active slide
         * @private
         */
        _setupIntersectionObserver() {
            // Create observer
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (
                            entry.isIntersecting &&
                            entry.intersectionRatio >= 0.5
                        ) {
                            const index = this.slides.indexOf(entry.target)
                            if (
                                index !== -1 &&
                                index !== this.currentSlideIndex
                            ) {
                                this._updateActiveSlide(index)
                            }
                        }
                    })
                },
                { threshold: 0.5 }
            )

            // Observe all slides
            this.slides.forEach((slide) => {
                this.observer.observe(slide)
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
         * Validate a slide's inputs
         * @param {HTMLElement} slide - The slide to validate
         * @returns {boolean} - True if valid, false otherwise
         * @private
         */
        _validateSlide(slide) {
            const inputs = slide.querySelectorAll(this.options.inputSelector)
            let isValid = true

            inputs.forEach((input) => {
                // Clear previous errors
                this._clearInputError(input)

                // Skip if not required and empty
                if (
                    !input.hasAttribute('required') &&
                    input.value.trim() === ''
                ) {
                    return
                }

                // Check if empty
                if (
                    input.hasAttribute('required') &&
                    input.value.trim() === ''
                ) {
                    this._showInputError(input, 'This field is required')
                    isValid = false
                    return
                }

                // Email validation
                if (
                    input.type === 'email' &&
                    input.value.trim() !== '' &&
                    !this._validateEmail(input.value)
                ) {
                    this._showInputError(
                        input,
                        'Please enter a valid email address'
                    )
                    isValid = false
                    return
                }

                // Number validation
                if (input.type === 'number' && input.value.trim() !== '') {
                    const min = parseFloat(input.getAttribute('min'))
                    const max = parseFloat(input.getAttribute('max'))
                    const value = parseFloat(input.value)

                    if (isNaN(value)) {
                        this._showInputError(
                            input,
                            'Please enter a valid number'
                        )
                        isValid = false
                        return
                    }

                    if (!isNaN(min) && value < min) {
                        this._showInputError(input, `Minimum value is ${min}`)
                        isValid = false
                        return
                    }

                    if (!isNaN(max) && value > max) {
                        this._showInputError(input, `Maximum value is ${max}`)
                        isValid = false
                        return
                    }
                }
            })

            return isValid
        }

        /**
         * Validate email address
         * @param {string} email - Email to validate
         * @returns {boolean} - True if valid, false otherwise
         * @private
         */
        _validateEmail(email) {
            const re =
                /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            return re.test(String(email).toLowerCase())
        }

        /**
         * Show input error
         * @param {HTMLElement} input - Input element
         * @param {string} message - Error message
         * @private
         */
        _showInputError(input, message) {
            input.style.borderColor = 'var(--mct-error-color, #ff3860)'

            // Find question container
            const questionContainer =
                input.closest('[data-fc-question]') || input.parentNode

            // Create error message
            let errorElement =
                questionContainer.querySelector('.fc-error-message')
            if (!errorElement) {
                errorElement = document.createElement('div')
                errorElement.className = 'fc-error-message'
                errorElement.style.color = 'var(--mct-error-color, #ff3860)'
                errorElement.style.fontSize = '0.875rem'
                errorElement.style.marginTop = '-1rem'
                errorElement.style.marginBottom = '1rem'
                questionContainer.appendChild(errorElement)
            }

            errorElement.textContent = message

            // Focus the input
            input.focus()
        }

        /**
         * Clear input error
         * @param {HTMLElement} input - Input element
         * @private
         */
        _clearInputError(input) {
            input.style.borderColor = ''

            // Find question container
            const questionContainer =
                input.closest('[data-fc-question]') || input.parentNode

            // Remove error message
            const errorElement =
                questionContainer.querySelector('.fc-error-message')
            if (errorElement) {
                errorElement.remove()
            }
        }

        /**
         * Handle form submission
         * @private
         */
        _handleSubmit() {
            // Validate last slide
            const lastSlide = this.slides[this.currentSlideIndex]
            if (!this._validateSlide(lastSlide)) {
                return
            }

            // Collect form data
            const formData = this._collectFormData()

            // Trigger submit event
            const submitEvent = new CustomEvent('formchippy:submit', {
                detail: {
                    formName: this.formName,
                    formData: formData,
                },
                bubbles: true,
            })

            this.container.dispatchEvent(submitEvent)

            console.log(
                `Form '${this.formName}' submitted with data:`,
                formData
            )

            // You can add your own submission logic here
            // Example:
            /*
      fetch('/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formName: this.formName, formData })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
      })
      .catch(error => {
        console.error('Error:', error);
      });
      */
        }

        /**
         * Collect form data from all inputs
         * @returns {Object} - Form data
         * @private
         */
        _collectFormData() {
            const formData = {}

            this.slides.forEach((slide) => {
                const slideId = slide.getAttribute('data-fc-slide')
                const inputs = slide.querySelectorAll(
                    this.options.inputSelector
                )

                inputs.forEach((input, inputIndex) => {
                    const inputName =
                        input.getAttribute('name') ||
                        `${slideId}-input-${inputIndex}`
                    formData[inputName] = input.value
                })
            })


            return formData
        }

        /**
         * Update active slide
         * @param {number} index - Slide index
         * @private
         */
        _updateActiveSlide(index) {
            // Update current index
            this.currentSlideIndex = index

            // Update active class on slides
            this.slides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add(this.options.activeClass)
                } else {
                    slide.classList.remove(this.options.activeClass)
                }
            })

            // Update dots
            if (this.dots.length > 0) {
                this.dots.forEach((dot, i) => {
                    if (i === index) {
                        dot.classList.add(this.options.activeClass)
                        dot.setAttribute('aria-current', 'true')
                    } else {
                        dot.classList.remove(this.options.activeClass)
                        dot.removeAttribute('aria-current')
                    }
                })
            }

            // Update progress bar
            if (this.progressBar) {
                const progress = ((index + 1) / this.totalSlides) * 100
                this.progressBar.style.width = `${progress}%`
                this.progressBar.setAttribute('aria-valuenow', progress)
                this.progressBar.setAttribute('aria-valuemin', 0)
                this.progressBar.setAttribute('aria-valuemax', 100)
            }

            // Focus on first input if present
            setTimeout(() => {
                const activeInput = this.slides[index].querySelector(
                    this.options.inputSelector
                )
                if (activeInput) {
                    activeInput.focus()
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
        }

        /**
         * Go to a specific slide
         * @param {number} index - Slide index
         * @param {boolean} animate - Whether to animate the scroll
         * @public
         */
        goToSlide(index, animate = true) {
            // Check if index is valid
            if (index < 0 || index >= this.totalSlides) {
                return
            }

            // Set animating flag
            this.isAnimating = true

            // Scroll to slide
            this.slides[index].scrollIntoView({
                behavior: animate ? 'smooth' : 'auto',
                block: 'start',
            })

            // Update active slide
            this._updateActiveSlide(index)

            // Reset animating flag after animation
            setTimeout(
                () => {
                    this.isAnimating = false
                },
                animate ? 500 : 0
            )
        }

        /**
         * Go to the next slide
         * @public
         */
        next() {
            if (this.currentSlideIndex < this.totalSlides - 1) {
                // Validate current slide first
                const currentSlide = this.slides[this.currentSlideIndex]
                if (this._validateSlide(currentSlide)) {
                    this.goToSlide(this.currentSlideIndex + 1)
                }
            }
        }

        /**
         * Go to the previous slide
         * @public
         */
        prev() {
            if (this.currentSlideIndex > 0) {
                this.goToSlide(this.currentSlideIndex - 1)
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

            return this._validateSlide(this.slides[index])
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
                this._clearInputError(input)
            })

            // Go to first slide
            this.goToSlide(0)

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

            // Disconnect observer
            if (this.observer) {
                this.observer.disconnect()
            }

            // Remove dots
            if (this.dotsContainer) {
                this.dotsContainer.innerHTML = ''
            }

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
})
