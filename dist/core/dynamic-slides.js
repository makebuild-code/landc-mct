/**
 * DynamicSlides.js - Part of FormChippy v1.3.1
 * ==================================================
 * Extends FormChippy with the ability to dynamically add and remove slides
 * while updating progress indicators, navigation, and other components seamlessly.
 * 
 * Features:
 * - Add new slides to the slide list at any position during runtime
 * - Remove slides from the slide list without breaking navigation
 * - Automatically update progress indicators (both linear and donut)
 * - Update navigation controls and slide counters
 * - Works with slide groups for multi-section forms
 * - Preserves form data during slide manipulations
 * 
 * Usage Example:
 * ```javascript
 * // Add a new slide after the current one
 * formChippy.addSlide({
 *   id: 'new-slide-1',
 *   content: '<div data-fc-content><h2>New Slide</h2></div>',
 *   position: 'after',
 *   targetSlide: formChippy.getCurrentSlideIndex(),
 *   updateNavigation: true
 * });
 * ```
 * 
 * @author JP Dionisio
 * @since v1.3.0
 * @module core/dynamic-slides
 * @license MIT
 */

export class DynamicSlides {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.initialized = false;
    }

    /**
     * Initialize the dynamic slides functionality
     */
    init() {
        this.formChippy.debug.info('Initializing dynamic slides module');
        this.initialized = true;
        
        // Add methods to the FormChippy instance
        this.formChippy.addSlide = this.addSlide.bind(this);
        this.formChippy.removeSlide = this.removeSlide.bind(this);
        this.formChippy.addSlideGroup = this.addSlideGroup.bind(this);
        this.formChippy.removeSlideGroup = this.removeSlideGroup.bind(this);
        this.formChippy.showSlideGroup = this.showSlideGroup.bind(this);
        this.formChippy.hideSlideGroup = this.hideSlideGroup.bind(this);
        this.formChippy.updateSlidesList = this.updateSlidesList.bind(this);
        
        // Set up declarative slide group controls
        this._setupSlideGroupControls();
    }
    
    /**
     * Set up declarative slide group controls using data attributes
     * Supports:
     * - data-fc-show-group="group-id" - Show a specific slide group
     * - data-fc-hide-group="group-id" - Hide a specific slide group
     * - data-fc-toggle-group="group-id" - Toggle a slide group's visibility
     * 
     * Options:
     * - data-fc-navigate-to-first="true" - Navigate to first slide when showing
     * - data-fc-navigate-to-next="true" - Navigate to next slide when hiding
     * - data-fc-adjust-current-index="true" - Adjust current index when hiding
     * @private
     */
    _setupSlideGroupControls() {
        const container = this.formChippy.container;
        
        // Show group buttons
        const showGroupButtons = container.querySelectorAll('[data-fc-show-group]');
        showGroupButtons.forEach(button => {
            // Remove existing click listeners by cloning
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                const groupId = newButton.getAttribute('data-fc-show-group');
                const navigateToFirst = newButton.getAttribute('data-fc-navigate-to-first') === 'true';
                
                this.showSlideGroup(groupId, { navigateToFirst });
            });
        });
        
        // Hide group buttons
        const hideGroupButtons = container.querySelectorAll('[data-fc-hide-group]');
        hideGroupButtons.forEach(button => {
            // Remove existing click listeners by cloning
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                const groupId = newButton.getAttribute('data-fc-hide-group');
                const navigateToNext = newButton.getAttribute('data-fc-navigate-to-next') === 'true';
                const adjustCurrentIndex = newButton.getAttribute('data-fc-adjust-current-index') === 'true';
                
                this.hideSlideGroup(groupId, { navigateToNext, adjustCurrentIndex });
            });
        });
        
        // Toggle group buttons
        const toggleGroupButtons = container.querySelectorAll('[data-fc-toggle-group]');
        toggleGroupButtons.forEach(button => {
            // Remove existing click listeners by cloning
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                const groupId = newButton.getAttribute('data-fc-toggle-group');
                const navigateToFirst = newButton.getAttribute('data-fc-navigate-to-first') === 'true';
                const navigateToNext = newButton.getAttribute('data-fc-navigate-to-next') === 'true';
                const adjustCurrentIndex = newButton.getAttribute('data-fc-adjust-current-index') === 'true';
                
                // Check if the group is currently hidden
                const groupElement = this.formChippy.container.querySelector(`[data-fc-slide-group="${groupId}"]`);
                if (!groupElement) {
                    this.formChippy.debug.warn(`Slide group '${groupId}' not found`);
                    return;
                }
                
                const isHidden = groupElement.classList.contains('hide');
                if (isHidden) {
                    this.showSlideGroup(groupId, { navigateToFirst });
                } else {
                    this.hideSlideGroup(groupId, { navigateToNext, adjustCurrentIndex });
                }
            });
        });
    }

    /**
     * Update the internal slides list and related components
     * Call this after any DOM changes to slides
     */
    updateSlidesList() {
        // Re-query all slides within the slide list
        this.formChippy.slides = Array.from(
            this.formChippy.slideList.querySelectorAll(this.formChippy.options.slideSelector)
        );
        this.formChippy.totalSlides = this.formChippy.slides.length;
        
        // Update the slide parents map to track slide groups
        this.formChippy.slideParents = new Map();
        this.formChippy.slides.forEach(slide => {
            let parent = slide.parentElement;
            // Check if the parent is a slide group
            if (parent && parent.matches('[data-fc-slide-group]')) {
                this.formChippy.slideParents.set(slide, parent);
            }
        });
        
        // Update progress indicators
        if (this.formChippy.progress) {
            this.formChippy.progress.updateProgress(this.formChippy.currentSlideIndex);
        }
        
        // Update donut progress if available
        if (this.formChippy.donutProgress && this.formChippy.donutProgress.initialized) {
            // Use the donut's specialized method that accounts for visible slides
            this.formChippy.donutProgress.updateProgressFromCurrentSlide();
        }
        
        // Update navigation button states
        if (this.formChippy.navigation) {
            this.formChippy.navigation.updateButtonStates(this.formChippy.currentSlideIndex);
            this.formChippy.navigation.updateSlideCounter(this.formChippy.currentSlideIndex);
        }
        
        // Trigger an event for custom handling
        this.formChippy.trigger('slidesListUpdated', {
            totalSlides: this.formChippy.totalSlides,
            currentIndex: this.formChippy.currentSlideIndex,
            visibleSlides: this.formChippy.donutProgress ? 
                this.formChippy.donutProgress.visibleSlides.length : this.formChippy.totalSlides
        });
        
        this.formChippy.debug.info('Slides list updated', {
            totalSlides: this.formChippy.totalSlides,
            currentIndex: this.formChippy.currentSlideIndex,
            visibleSlides: this.formChippy.donutProgress ? 
                this.formChippy.donutProgress.visibleSlides.length : this.formChippy.totalSlides
        });
    }

    /**
     * Add a new slide to the slide list
     * @param {HTMLElement|string} slide - The slide element or HTML string to add
     * @param {Object} options - Options for adding the slide
     * @param {number} options.position - Position to insert the slide (default: end)
     * @param {string} options.id - ID for the slide (data-fc-slide attribute)
     * @param {boolean} options.navigateToNew - Whether to navigate to the new slide after adding
     * @returns {HTMLElement} The added slide element
     */
    addSlide(slide, options = {}) {
        if (!this.initialized) {
            this.formChippy.debug.error('Dynamic slides module not initialized');
            return null;
        }
        
        // Default options
        const defaultOptions = {
            position: this.formChippy.totalSlides, // Default to end
            id: 'slide-' + Date.now(),
            navigateToNew: false
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        let slideElement;
        
        // Create slide element from string if needed
        if (typeof slide === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = slide.trim();
            slideElement = tempDiv.firstChild;
        } else {
            slideElement = slide;
        }
        
        // Ensure the slide has the data-fc-slide attribute
        if (!slideElement.hasAttribute('data-fc-slide')) {
            slideElement.setAttribute('data-fc-slide', mergedOptions.id);
        }
        
        // Insert the slide at the specified position
        if (mergedOptions.position >= this.formChippy.totalSlides) {
            // Append to the end
            this.formChippy.slideList.appendChild(slideElement);
        } else {
            // Insert before the slide at the specified position
            const referenceSlide = this.formChippy.slides[mergedOptions.position];
            this.formChippy.slideList.insertBefore(slideElement, referenceSlide);
        }
        
        // Update the slides list and related components
        this.updateSlidesList();
        
        // Navigate to the new slide if requested
        if (mergedOptions.navigateToNew) {
            // Find the index of the new slide
            const newIndex = Array.from(this.formChippy.slides).indexOf(slideElement);
            if (newIndex !== -1) {
                this.formChippy.goToSlide(newIndex);
            }
        }
        
        // Log the addition
        this.formChippy.debug.info('Slide added', {
            id: slideElement.getAttribute('data-fc-slide'),
            position: mergedOptions.position,
            navigateToNew: mergedOptions.navigateToNew
        });
        
        return slideElement;
    }

    /**
     * Remove a slide from the slide list
     * @param {HTMLElement|number|string} slide - The slide to remove (element, index, or ID)
     * @param {Object} options - Options for removing the slide
     * @param {boolean} options.adjustCurrentIndex - Whether to adjust the current index if removing the current slide
     * @returns {boolean} Whether the removal was successful
     */
    removeSlide(slide, options = {}) {
        if (!this.initialized) {
            this.formChippy.debug.error('Dynamic slides module not initialized');
            return false;
        }
        
        // Default options
        const defaultOptions = {
            adjustCurrentIndex: true
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        let slideElement;
        let slideIndex;
        
        // Find the slide element based on the input type
        if (typeof slide === 'number') {
            // Input is an index
            slideIndex = slide;
            slideElement = this.formChippy.slides[slideIndex];
        } else if (typeof slide === 'string') {
            // Input is a slide ID
            slideElement = this.formChippy.slideList.querySelector(`[data-fc-slide="${slide}"]`);
            slideIndex = Array.from(this.formChippy.slides).indexOf(slideElement);
        } else {
            // Input is a slide element
            slideElement = slide;
            slideIndex = Array.from(this.formChippy.slides).indexOf(slideElement);
        }
        
        // Check if the slide was found
        if (!slideElement || slideIndex === -1) {
            this.formChippy.debug.error('Slide not found for removal', { slide });
            return false;
        }
        
        // Check if removing the current slide
        const isRemovingCurrentSlide = slideIndex === this.formChippy.currentSlideIndex;
        
        // Remove the slide from the DOM
        slideElement.parentNode.removeChild(slideElement);
        
        // Adjust the current index if needed
        if (isRemovingCurrentSlide && mergedOptions.adjustCurrentIndex) {
            // If removing the last slide, go to the new last slide
            if (slideIndex >= this.formChippy.totalSlides - 1) {
                this.formChippy.currentSlideIndex = Math.max(0, this.formChippy.totalSlides - 2);
            }
            // Otherwise, stay at the same index (which now points to the next slide)
        } else if (slideIndex < this.formChippy.currentSlideIndex) {
            // If removing a slide before the current one, adjust the current index
            this.formChippy.currentSlideIndex--;
        }
        
        // Update the slides list and related components
        this.updateSlidesList();
        
        // If we removed the current slide, navigate to the adjusted index
        if (isRemovingCurrentSlide && mergedOptions.adjustCurrentIndex) {
            this.formChippy.goToSlide(this.formChippy.currentSlideIndex);
        }
        
        // Log the removal
        this.formChippy.debug.info('Slide removed', {
            index: slideIndex,
            id: slideElement.getAttribute('data-fc-slide'),
            wasCurrentSlide: isRemovingCurrentSlide,
            newCurrentIndex: this.formChippy.currentSlideIndex
        });
        
        return true;
    }

    /**
     * Add a slide group to the form
     * @param {HTMLElement|string} group - The slide group element or HTML string to add
     * @param {Object} options - Options for adding the group
     * @param {string} options.id - ID for the group (data-fc-slide-group attribute)
     * @param {boolean} options.show - Whether to show the group after adding (default: true)
     * @returns {HTMLElement} The added slide group element
     */
    addSlideGroup(group, options = {}) {
        if (!this.initialized) {
            this.formChippy.debug.error('Dynamic slides module not initialized');
            return null;
        }
        
        // Default options
        const defaultOptions = {
            id: 'group-' + Date.now(),
            show: true
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        let groupElement;
        
        // Create group element from string if needed
        if (typeof group === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = group.trim();
            groupElement = tempDiv.firstChild;
        } else {
            groupElement = group;
        }
        
        // Ensure the group has the data-fc-slide-group attribute
        if (!groupElement.hasAttribute('data-fc-slide-group')) {
            groupElement.setAttribute('data-fc-slide-group', mergedOptions.id);
        }
        
        // Add the group to the slide list
        this.formChippy.slideList.appendChild(groupElement);
        
        // Show or hide the group based on options
        if (mergedOptions.show) {
            groupElement.classList.remove('hide');
        } else {
            groupElement.classList.add('hide');
        }
        
        // Update the slides list and related components
        this.updateSlidesList();
        
        // Log the addition
        this.formChippy.debug.info('Slide group added', {
            id: groupElement.getAttribute('data-fc-slide-group'),
            show: mergedOptions.show
        });
        
        return groupElement;
    }

    /**
     * Remove a slide group from the form
     * @param {HTMLElement|string} group - The slide group to remove (element or ID)
     * @param {Object} options - Options for removing the group
     * @param {boolean} options.adjustCurrentIndex - Whether to adjust the current index if removing slides in the current view
     * @returns {boolean} Whether the removal was successful
     */
    removeSlideGroup(group, options = {}) {
        if (!this.initialized) {
            this.formChippy.debug.error('Dynamic slides module not initialized');
            return false;
        }
        
        // Default options
        const defaultOptions = {
            adjustCurrentIndex: true
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        let groupElement;
        
        // Find the group element based on the input type
        if (typeof group === 'string') {
            // Input is a group ID
            groupElement = this.formChippy.slideList.querySelector(`[data-fc-slide-group="${group}"]`);
        } else {
            // Input is a group element
            groupElement = group;
        }
        
        // Check if the group was found
        if (!groupElement) {
            this.formChippy.debug.error('Slide group not found for removal', { group });
            return false;
        }
        
        // Check if the group contains the current slide
        const groupSlides = Array.from(groupElement.querySelectorAll(this.formChippy.options.slideSelector));
        const currentSlideInGroup = groupSlides.some(slide => 
            Array.from(this.formChippy.slides).indexOf(slide) === this.formChippy.currentSlideIndex
        );
        
        // Find the index of the first slide in the group
        const firstSlideIndex = groupSlides.length > 0 ? 
            Array.from(this.formChippy.slides).indexOf(groupSlides[0]) : -1;
        
        // Remove the group from the DOM
        groupElement.parentNode.removeChild(groupElement);
        
        // Adjust the current index if needed
        if (currentSlideInGroup && mergedOptions.adjustCurrentIndex) {
            // Navigate to the slide before the group
            this.formChippy.currentSlideIndex = Math.max(0, firstSlideIndex - 1);
        } else if (firstSlideIndex !== -1 && firstSlideIndex < this.formChippy.currentSlideIndex) {
            // If removing slides before the current one, adjust the current index
            this.formChippy.currentSlideIndex -= groupSlides.length;
        }
        
        // Update the slides list and related components
        this.updateSlidesList();
        
        // If we removed the current slide, navigate to the adjusted index
        if (currentSlideInGroup && mergedOptions.adjustCurrentIndex) {
            this.formChippy.goToSlide(this.formChippy.currentSlideIndex);
        }
        
        // Log the removal
        this.formChippy.debug.info('Slide group removed', {
            id: groupElement.getAttribute('data-fc-slide-group'),
            containedCurrentSlide: currentSlideInGroup,
            newCurrentIndex: this.formChippy.currentSlideIndex
        });
        
        return true;
    }

    /**
     * Show a slide group
     * @param {HTMLElement|string} group - The slide group to show (element or ID)
     * @param {Object} options - Options for showing the group
     * @param {boolean} options.navigateToFirst - Whether to navigate to the first slide in the group
     * @returns {boolean} Whether the operation was successful
     */
    showSlideGroup(group, options = {}) {
        if (!this.initialized) {
            this.formChippy.debug.error('Dynamic slides module not initialized');
            return false;
        }
        
        // Default options
        const defaultOptions = {
            navigateToFirst: false
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        let groupElement;
        
        // Find the group element based on the input type
        if (typeof group === 'string') {
            // Input is a group ID
            groupElement = this.formChippy.slideList.querySelector(`[data-fc-slide-group="${group}"]`);
        } else {
            // Input is a group element
            groupElement = group;
        }
        
        // Check if the group was found
        if (!groupElement) {
            this.formChippy.debug.error('Slide group not found to show', { group });
            return false;
        }
        
        // Check if it's already visible
        if (!groupElement.classList.contains('hide') && 
            groupElement.style.display !== 'none') {
            this.formChippy.debug.info('Slide group is already visible', {
                id: groupElement.getAttribute('data-fc-slide-group')
            });
            
            // Still navigate if requested
            if (mergedOptions.navigateToFirst) {
                const firstSlideInGroup = groupElement.querySelector(this.formChippy.options.slideSelector);
                if (firstSlideInGroup) {
                    const slideIndex = Array.from(this.formChippy.slides).indexOf(firstSlideInGroup);
                    if (slideIndex !== -1) {
                        this.formChippy.goToSlide(slideIndex);
                    }
                }
            }
            
            return true;
        }
        
        // Show the group
        groupElement.classList.remove('hide');
        groupElement.style.display = '';
        
        // Update the slides list and related components
        this.updateSlidesList();
        
        // Navigate to the first slide in the group if requested
        if (mergedOptions.navigateToFirst) {
            const firstSlideInGroup = groupElement.querySelector(this.formChippy.options.slideSelector);
            if (firstSlideInGroup) {
                const slideIndex = Array.from(this.formChippy.slides).indexOf(firstSlideInGroup);
                if (slideIndex !== -1) {
                    this.formChippy.goToSlide(slideIndex);
                }
            }
        }
        
        // Log the operation
        this.formChippy.debug.info('Slide group shown', {
            id: groupElement.getAttribute('data-fc-slide-group'),
            navigateToFirst: mergedOptions.navigateToFirst
        });
        
        return true;
    }

    /**
     * Hide a slide group
     * @param {HTMLElement|string} group - The slide group to hide (element or ID)
     * @param {Object} options - Options for hiding the group
     * @param {boolean} options.adjustCurrentIndex - Whether to adjust the current index if hiding the current slide
     * @param {boolean} options.navigateToNext - Whether to navigate to the next slide after the group
     * @returns {boolean} Whether the operation was successful
     */
    hideSlideGroup(group, options = {}) {
        if (!this.initialized) {
            this.formChippy.debug.error('Dynamic slides module not initialized');
            return false;
        }
        
        // Default options
        const defaultOptions = {
            adjustCurrentIndex: true,
            navigateToNext: false
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        let groupElement;
        
        // Find the group element based on the input type
        if (typeof group === 'string') {
            // Input is a group ID
            groupElement = this.formChippy.slideList.querySelector(`[data-fc-slide-group="${group}"]`);
        } else {
            // Input is a group element
            groupElement = group;
        }
        
        // Check if the group was found
        if (!groupElement) {
            this.formChippy.debug.error('Slide group not found to hide', { group });
            return false;
        }
        
        // Check if it's already hidden
        if (groupElement.classList.contains('hide') || 
            groupElement.style.display === 'none') {
            this.formChippy.debug.info('Slide group is already hidden', {
                id: groupElement.getAttribute('data-fc-slide-group')
            });
            return true;
        }
        
        // Check if the group contains the current slide
        const groupSlides = Array.from(groupElement.querySelectorAll(this.formChippy.options.slideSelector));
        const currentSlideInGroup = groupSlides.some(slide => 
            Array.from(this.formChippy.slides).indexOf(slide) === this.formChippy.currentSlideIndex
        );
        
        // Store the slide indices before hiding the group
        const groupSlideIndices = groupSlides.map(slide => 
            Array.from(this.formChippy.slides).indexOf(slide)
        ).filter(index => index !== -1);
        
        const firstSlideIndex = Math.min(...groupSlideIndices);
        const lastSlideIndex = Math.max(...groupSlideIndices);
        
        // Hide the group
        groupElement.classList.add('hide');
        groupElement.style.display = 'none';
        
        // Determine the target slide index for navigation
        let targetSlideIndex = this.formChippy.currentSlideIndex;
        
        if (currentSlideInGroup && mergedOptions.adjustCurrentIndex) {
            if (mergedOptions.navigateToNext) {
                // Try to navigate to the slide after the group
                targetSlideIndex = lastSlideIndex + 1;
                if (targetSlideIndex >= this.formChippy.totalSlides) {
                    // If we're at the end, go to the slide before the group
                    targetSlideIndex = Math.max(0, firstSlideIndex - 1);
                }
            } else {
                // Default: navigate to the slide before the group
                targetSlideIndex = Math.max(0, firstSlideIndex - 1);
            }
        }
        
        // Update the slides list before navigation
        this.updateSlidesList();
        
        // Navigate if needed
        if (currentSlideInGroup && mergedOptions.adjustCurrentIndex) {
            // Check if the target slide is in another hidden group
            const targetSlide = this.formChippy.slides[targetSlideIndex];
            if (targetSlide) {
                // Check if the target slide is in a hidden group
                const targetParent = targetSlide.parentElement;
                if (targetParent && targetParent.matches('[data-fc-slide-group]') && 
                    (targetParent.classList.contains('hide') || targetParent.style.display === 'none')) {
                    
                    // Find the first visible slide
                    for (let i = 0; i < this.formChippy.totalSlides; i++) {
                        const slide = this.formChippy.slides[i];
                        const parent = slide.parentElement;
                        
                        // Check if this slide is visible (not in a hidden group)
                        const isInHiddenGroup = parent && parent.matches('[data-fc-slide-group]') && 
                                              (parent.classList.contains('hide') || parent.style.display === 'none');
                        
                        if (!isInHiddenGroup) {
                            targetSlideIndex = i;
                            break;
                        }
                    }
                }
                
                // Navigate to the selected slide
                this.formChippy.goToSlide(targetSlideIndex);
            }
        }
        
        // Log the operation
        this.formChippy.debug.info('Slide group hidden', {
            id: groupElement.getAttribute('data-fc-slide-group'),
            containedCurrentSlide: currentSlideInGroup,
            newCurrentIndex: this.formChippy.currentSlideIndex
        });
        
        return true;
    }
}
