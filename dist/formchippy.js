/**
 * FormChippy.js v1.5.0
 * A smooth, vertical scrolling multi-step form experience
 * Created for L&C Mortgage Finder
 *
 * New in v1.5.0:
 * - Enhanced form validation system with hierarchical required/optional handling
 * - Added support for 'data-fc-required="false"' at multiple DOM levels (slide, content, field, etc.)
 * - Unified error handling with consistent application of error classes to content elements
 * - Improved debug logging throughout the validation process
 *
 * New in v1.4.0:
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
 * @license MIT
 * @author JP Dionisio
 * Copyright (c) 2025 JP Dionisio
 */

// Import core modules
import { Navigation } from './core/navigation.js'
import { Validation } from './core/validation.js'
import { Progress } from './core/progress.js'
import { DonutProgress } from './core/donut-progress.js'
import { DynamicSlides } from './core/dynamic-slides.js'
import { InputActive } from './core/inputactive.js'
import { Debug } from './core/debug.js'

// Import question types
import { TextInput } from './questions/text.js'
import { RadioInput } from './questions/radio.js'
import { ToggleInput } from './questions/toggle.js'
import { FileInput } from './questions/file.js'
import { TextareaInput } from './questions/textarea.js'
import { DateInput } from './questions/date.js'

class FormChippy {
    constructor(options = {}) {
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
        this.questionHandlers = {}

        // Initialize
        this._init()
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
        // Get main elements
        this.container = document.querySelector(this.options.containerSelector)
        if (!this.container) {
            console.error('FormChippy: Container not found')
            return
        }

        this.formName =
            this.container.getAttribute('data-fc-container') || 'form'

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
        this.slides = allSlides.filter(slide => !this._hasHiddenAncestor(slide))
        this.totalSlides = this.slides.length
        
        // Log any filtered slides for debugging
        if (allSlides.length !== this.slides.length) {
            console.info(
                `FormChippy: Filtered out ${allSlides.length - this.slides.length} slides with hidden ancestors`
            )
        }
        
        // Store the parent structure for each slide to help with navigation
        this.slideParents = new Map()
        this.slides.forEach(slide => {
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
        this.validation = new Validation(this)
        this.navigation = new Navigation(this)
        this.progress = new Progress(this)
        this.donutProgress = new DonutProgress(this)
        this.dynamicSlides = new DynamicSlides(this)
        this.inputActive = new InputActive(this)

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
        let current = element;
        
        // Check the element and all its ancestors up to the slide-list
        while (current && !current.hasAttribute('data-fc-slide-list')) {
            // Get computed style to check display property
            const style = window.getComputedStyle(current);
            
            if (style.display === 'none') {
                return true;
            }
            
            current = current.parentElement;
        }
        
        return false;
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
                    maxHeight: ''
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
            slideId: this.slides[index].getAttribute('data-fc-slide')
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
                    if (!el._fcOriginalTabindex && el.hasAttribute('tabindex')) {
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
            lastElement: lastFocusable.tagName
        })

        // Initialize trap handlers array if needed
        this._activeTrapHandlers = this._activeTrapHandlers || []

        // Add event listener to the first focusable element
        const firstHandler = (e) => {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault()
                lastFocusable.focus()
                this.debug.info('Focus trap: wrapped from first to last element')
            }
        }

        // Add event listener to the last focusable element
        const lastHandler = (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                firstFocusable.focus()
                this.debug.info('Focus trap: wrapped from last to first element')
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
            if (slideGroup.style.display === 'none' || slideGroup.classList.contains('fc-hidden')) {
                this.debug.info(`Target slide ${index} is in a hidden slide group. Making group visible.`)
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
                    overflowY: 'scroll',
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
                            maxHeight: ''
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
const instances = {}

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Find all containers with the data-fc-container attribute
    const containers = document.querySelectorAll('[data-fc-container]')

    containers.forEach((container) => {
        const formName = container.getAttribute('data-fc-container')
        const autoInitAttr = container.getAttribute('data-fc-auto-init')

        // If auto-init is explicitly set to false, skip this container
        if (autoInitAttr !== null && autoInitAttr === 'false') {
            console.info(
                `FormChippy: Skipping auto-init for ${formName} due to data-fc-auto-init="false"`
            )
            return
        }

        // Create FormChippy instance with specific container options
        instances[formName] = new FormChippy({
            containerSelector: `[data-fc-container="${formName}"]`,
        })
    })
})

// Global API
window.formChippy = {
    /**
     * Get instance by form name
     * @param {string} formName - Name of the form
     * @returns {FormChippy|null} FormChippy instance or null if not found
     */
    getInstance: (formName) => {
        return instances[formName] || null
    },

    /**
     * Create a new instance
     * @param {Object} options - FormChippy options
     * @returns {FormChippy} New FormChippy instance
     */
    create: (options) => {
        const instance = new FormChippy(options)
        if (instance.container) {
            const formName = instance.formName
            instances[formName] = instance
        }
        return instance
    },

    /**
     * Initialize all FormChippy instances in the document
     * This can be called manually if the DOM is dynamically loaded
     */
    initAll: () => {
        const containers = document.querySelectorAll('[data-fc-container]')

        containers.forEach((container) => {
            const formName = container.getAttribute('data-fc-container')
            const autoInitAttr = container.getAttribute('data-fc-auto-init')

            // If already initialized or auto-init is false, skip
            if (
                instances[formName] ||
                (autoInitAttr !== null && autoInitAttr === 'false')
            ) {
                return
            }

            // Create FormChippy instance with specific container options
            instances[formName] = new FormChippy({
                containerSelector: `[data-fc-container="${formName}"]`,
            })
        })

        return instances
    },
}

export default FormChippy
