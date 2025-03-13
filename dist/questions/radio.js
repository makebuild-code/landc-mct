/**
 * Radio.js
 * Handles radio button inputs
 */

export class RadioInput {
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
