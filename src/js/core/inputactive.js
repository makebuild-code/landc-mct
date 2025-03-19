/**
 * InputActive.js
 * Adds active state classes to form elements when they are checked/selected
 * Inspired by Finsweet's InputActive attribute
 */

export class InputActive {
    constructor(formChippy) {
        this.formChippy = formChippy
        this.options = formChippy.options

        // Default class name for active elements
        // this.activeClass = 'is-active-input';
        this.activeClass = 'checked'

        // Initialize
        this._init()
    }

    /**
     * Initialize input active state tracking
     * @private
     */
    _init() {
        // Process all inputs on initialization
        this._processAllInputs()

        // Set up change event listeners
        this._setupEventListeners()
    }

    /**
     * Process all inputs to apply initial active states
     * @private
     */
    _processAllInputs() {
        const inputs = this.formChippy.container.querySelectorAll('input')
        inputs.forEach((input) => this._updateInputState(input))
    }

    /**
     * Set up event listeners for input changes
     * @private
     */
    _setupEventListeners() {
        // Listen for changes on the entire form to catch all input changes
        this.formChippy.container.addEventListener('change', (event) => {
            const { target } = event
            if (target instanceof HTMLInputElement) {
                this._updateInputState(target)
            }
        })

        // Also listen to FormChippy's internal events
        this.formChippy.on('slide:change', () => {
            // Process inputs again when changing slides
            setTimeout(() => this._processAllInputs(), 100)
        })
    }

    /**
     * Update the active state of an input
     * @param {HTMLInputElement} input - The input element
     * @private
     */
    _updateInputState(input) {
        // Only handle checkbox and radio inputs
        if (input.type !== 'checkbox' && input.type !== 'radio') return

        // Get the active class, either from the input's data attribute or the default
        const activeClass = this._getActiveClass(input)

        if (input.type === 'checkbox') {
            // For checkboxes, apply to the parent container
            const container = this._getInputContainer(input)
            if (container) {
                this._toggleClass(container, activeClass, input.checked)
            }
        } else if (input.type === 'radio') {
            // For radio buttons, handle all related inputs with the same name
            const name = input.name
            if (!name) return

            const radios = this.formChippy.container.querySelectorAll(
                `input[type="radio"][name="${name}"]`
            )
            radios.forEach((radio) => {
                const container = this._getInputContainer(radio)
                if (container) {
                    this._toggleClass(container, activeClass, radio.checked)
                }
            })
        }
    }

    /**
     * Get the container element for an input
     * @param {HTMLInputElement} input - The input element
     * @returns {HTMLElement|null} - The container element or null if not found
     * @private
     */
    _getInputContainer(input) {
        // Look for Webflow's standard classes
        const webflowCheckbox = input.closest('.w-checkbox')
        if (webflowCheckbox) return webflowCheckbox

        const webflowRadio = input.closest('.w-radio')
        if (webflowRadio) return webflowRadio

        // Look for FormChippy's custom containers
        const fcContainer = input.closest('[data-fc-input-container]')
        if (fcContainer) return fcContainer

        // Fall back to the label or the closest parent that's not a form
        const label = input.closest('label')
        if (label) return label

        // If no specific container is found, return the parent element if it's not the form itself
        const parent = input.parentElement
        if (parent && parent.tagName !== 'FORM') return parent

        // No suitable container found
        return null
    }

    /**
     * Get the active class name for an input
     * @param {HTMLInputElement} input - The input element
     * @returns {string} - The active class name
     * @private
     */
    _getActiveClass(input) {
        // Check for custom active class on the input or its container
        const container = this._getInputContainer(input)

        if (input.hasAttribute('data-fc-active-class')) {
            return input.getAttribute('data-fc-active-class')
        }

        if (container && container.hasAttribute('data-fc-active-class')) {
            return container.getAttribute('data-fc-active-class')
        }

        return this.activeClass
    }

    /**
     * Toggle a class on an element
     * @param {HTMLElement} element - The element to toggle the class on
     * @param {string} className - The class name to toggle
     * @param {boolean} add - Whether to add or remove the class
     * @private
     */
    _toggleClass(element, className, add) {
        if (add) {
            element.classList.add(className)
        } else {
            element.classList.remove(className)
        }
    }

    /**
     * Manually update all input states
     * Useful to call after dynamically adding new inputs
     */
    refresh() {
        this._processAllInputs()
    }
}
