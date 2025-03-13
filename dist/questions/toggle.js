/**
 * Toggle.js
 * Handles toggle/checkbox inputs
 */

export class ToggleInput {
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
