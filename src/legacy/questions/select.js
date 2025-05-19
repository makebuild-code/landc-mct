/**
 * Select.js
 * Handles select/dropdown inputs
 */

export class SelectInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize select input handling
     * @private
     */
    _init() {
        // Find all select inputs
        const selects = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[data-fc-select], select${this.options.inputSelector}`
        );
        
        // Add event listeners
        selects.forEach(select => {
            // Enhance select if needed
            if (select.hasAttribute('data-fc-enhanced')) {
                this._enhanceSelect(select);
            }
            
            // Change event
            select.addEventListener('change', () => {
                // Clear any errors
                this.formChippy.validation.clearInputError(select);
                
                // Auto-advance if enabled
                if (select.hasAttribute('data-fc-auto-advance')) {
                    // Find the slide containing this select
                    const slide = select.closest(this.options.slideSelector);
                    const slideIndex = this.formChippy.slides.indexOf(slide);
                    
                    // Go to next slide if not the last slide and a value is selected
                    if (slideIndex < this.formChippy.totalSlides - 1 && select.value) {
                        // Short delay to show selection before advancing
                        setTimeout(() => {
                            this.formChippy.goToSlide(slideIndex + 1);
                        }, 300);
                    }
                }
            });
        });
    }
    
    /**
     * Enhance a select element with custom styling and behavior
     * @param {HTMLElement} select - The select element to enhance
     * @private
     */
    _enhanceSelect(select) {
        // Skip if already enhanced
        if (select.parentNode.classList.contains('fc-select-container')) return;
        
        // Create container
        const container = document.createElement('div');
        container.className = 'fc-select-container';
        
        // Insert container before select
        select.parentNode.insertBefore(container, select);
        
        // Move select inside container
        container.appendChild(select);
        
        // Create custom select
        const customSelect = document.createElement('div');
        customSelect.className = 'fc-select';
        
        // Create selected value display
        const selectedValue = document.createElement('div');
        selectedValue.className = 'fc-select-value';
        selectedValue.textContent = select.options[select.selectedIndex]?.text || select.getAttribute('placeholder') || 'Select an option';
        
        // Create arrow
        const arrow = document.createElement('div');
        arrow.className = 'fc-select-arrow';
        arrow.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10l5 5 5-5z" fill="currentColor"></path></svg>';
        
        // Assemble custom select
        customSelect.appendChild(selectedValue);
        customSelect.appendChild(arrow);
        container.appendChild(customSelect);
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'fc-select-dropdown';
        
        // Add options
        Array.from(select.options).forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'fc-select-option';
            optionElement.textContent = option.text;
            optionElement.dataset.value = option.value;
            
            // Mark as selected if current option
            if (index === select.selectedIndex) {
                optionElement.classList.add('selected');
            }
            
            // Option click handler
            optionElement.addEventListener('click', () => {
                // Update real select
                select.selectedIndex = index;
                select.dispatchEvent(new Event('change'));
                
                // Update custom select
                selectedValue.textContent = option.text;
                
                // Update selected class
                Array.from(dropdown.children).forEach(el => {
                    el.classList.remove('selected');
                });
                optionElement.classList.add('selected');
                
                // Close dropdown
                this._closeDropdown(container);
            });
            
            dropdown.appendChild(optionElement);
        });
        
        // Add dropdown to container
        container.appendChild(dropdown);
        
        // Toggle dropdown on click
        customSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Check if dropdown is open
            const isOpen = container.classList.contains('fc-select-open');
            
            // Close all open dropdowns
            document.querySelectorAll('.fc-select-open').forEach(el => {
                this._closeDropdown(el);
            });
            
            // Toggle current dropdown
            if (!isOpen) {
                this._openDropdown(container);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this._closeDropdown(container);
        });
        
        // Update on select change
        select.addEventListener('change', () => {
            selectedValue.textContent = select.options[select.selectedIndex]?.text || 'Select an option';
            
            // Update selected option in dropdown
            Array.from(dropdown.children).forEach(option => {
                option.classList.remove('selected');
                if (option.dataset.value === select.value) {
                    option.classList.add('selected');
                }
            });
        });
        
        // Handle keyboard navigation
        customSelect.addEventListener('keydown', (e) => {
            const isOpen = container.classList.contains('fc-select-open');
            
            switch (e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    isOpen ? this._closeDropdown(container) : this._openDropdown(container);
                    break;
                case 'Escape':
                    if (isOpen) {
                        e.preventDefault();
                        this._closeDropdown(container);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!isOpen) {
                        this._openDropdown(container);
                    } else {
                        this._navigateOptions(dropdown, 'next');
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (isOpen) {
                        this._navigateOptions(dropdown, 'prev');
                    }
                    break;
                case 'Home':
                    if (isOpen) {
                        e.preventDefault();
                        this._navigateOptions(dropdown, 'first');
                    }
                    break;
                case 'End':
                    if (isOpen) {
                        e.preventDefault();
                        this._navigateOptions(dropdown, 'last');
                    }
                    break;
            }
        });
        
        // Make custom select focusable
        customSelect.tabIndex = 0;
        
        // Accessibility
        customSelect.setAttribute('role', 'combobox');
        customSelect.setAttribute('aria-haspopup', 'listbox');
        customSelect.setAttribute('aria-expanded', 'false');
        dropdown.setAttribute('role', 'listbox');
        
        // Set ARIA attributes for options
        Array.from(dropdown.children).forEach((option, index) => {
            option.setAttribute('role', 'option');
            option.id = `fc-option-${select.id || select.name}-${index}`;
            
            if (option.classList.contains('selected')) {
                option.setAttribute('aria-selected', 'true');
                customSelect.setAttribute('aria-activedescendant', option.id);
            } else {
                option.setAttribute('aria-selected', 'false');
            }
        });
    }
    
    /**
     * Open a select dropdown
     * @param {HTMLElement} container - Select container
     * @private
     */
    _openDropdown(container) {
        container.classList.add('fc-select-open');
        
        const customSelect = container.querySelector('.fc-select');
        const dropdown = container.querySelector('.fc-select-dropdown');
        
        customSelect.setAttribute('aria-expanded', 'true');
        
        // Position dropdown
        this._positionDropdown(container);
        
        // Scroll selected option into view
        const selectedOption = dropdown.querySelector('.selected');
        if (selectedOption) {
            selectedOption.scrollIntoView({ block: 'nearest' });
        }
    }
    
    /**
     * Close a select dropdown
     * @param {HTMLElement} container - Select container
     * @private
     */
    _closeDropdown(container) {
        if (!container) return;
        
        container.classList.remove('fc-select-open');
        
        const customSelect = container.querySelector('.fc-select');
        if (customSelect) {
            customSelect.setAttribute('aria-expanded', 'false');
        }
    }
    
    /**
     * Position the dropdown relative to the select
     * @param {HTMLElement} container - Select container 
     * @private
     */
    _positionDropdown(container) {
        const customSelect = container.querySelector('.fc-select');
        const dropdown = container.querySelector('.fc-select-dropdown');
        
        if (!customSelect || !dropdown) return;
        
        // Get dimensions
        const selectRect = customSelect.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Reset current positioning
        dropdown.style.top = '';
        dropdown.style.bottom = '';
        dropdown.style.maxHeight = '';
        
        // Determine if there's more space above or below
        const spaceBelow = windowHeight - selectRect.bottom;
        const spaceAbove = selectRect.top;
        
        // If more space below, show dropdown below select
        if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
            dropdown.style.top = '100%';
            dropdown.style.maxHeight = `${Math.min(200, spaceBelow - 10)}px`;
        } else {
            // Otherwise show above
            dropdown.style.bottom = '100%';
            dropdown.style.maxHeight = `${Math.min(200, spaceAbove - 10)}px`;
        }
    }
    
    /**
     * Navigate dropdown options with keyboard
     * @param {HTMLElement} dropdown - Dropdown element
     * @param {string} direction - Navigation direction (next, prev, first, last)
     * @private
     */
    _navigateOptions(dropdown, direction) {
        const options = Array.from(dropdown.querySelectorAll('.fc-select-option'));
        if (!options.length) return;
        
        let focusedOption = dropdown.querySelector('.fc-select-option:focus') || 
                             dropdown.querySelector('.fc-select-option.selected');
        let index = focusedOption ? options.indexOf(focusedOption) : -1;
        
        // Determine new index based on direction
        switch (direction) {
            case 'next':
                index = (index + 1) % options.length;
                break;
            case 'prev':
                index = index <= 0 ? options.length - 1 : index - 1;
                break;
            case 'first':
                index = 0;
                break;
            case 'last':
                index = options.length - 1;
                break;
        }
        
        // Focus the option
        if (index >= 0 && index < options.length) {
            options[index].focus();
            options[index].scrollIntoView({ block: 'nearest' });
        }
    }
    
    /**
     * Create a custom select element with the given options
     * @param {HTMLElement} container - Container to append the select to
     * @param {object} config - Configuration options
     */
    createSelect(container, config) {
        const {
            name,
            id = name,
            options = [],
            placeholder = 'Select an option',
            required = false,
            autoAdvance = false,
            enhanced = true,
            label = '',
            value = ''
        } = config;
        
        // Create select wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-select-wrapper';
        
        // Add label if provided
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            wrapper.appendChild(labelEl);
        }
        
        // Create select element
        const select = document.createElement('select');
        select.name = name;
        select.id = id;
        
        // Add data attributes
        select.setAttribute('data-fc-input', '');
        if (enhanced) select.setAttribute('data-fc-enhanced', '');
        if (autoAdvance) select.setAttribute('data-fc-auto-advance', '');
        if (required) {
            select.setAttribute('required', '');
            select.setAttribute('data-fc-required', '');
        }
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        placeholderOption.selected = !value;
        select.appendChild(placeholderOption);
        
        // Add options
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            if (option.value === value) optionEl.selected = true;
            select.appendChild(optionEl);
        });
        
        // Add to wrapper
        wrapper.appendChild(select);
        
        // Add wrapper to container
        container.appendChild(wrapper);
        
        // Enhance select if needed
        if (enhanced) {
            this._enhanceSelect(select);
        }
        
        return select;
    }
}
