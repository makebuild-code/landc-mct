/**
 * DonutProgress.js
 * Handles the circular/donut progress indicator for FormChippy
 *
 * Features:
 * - Circular progress visualization as an alternative to the linear progress bar
 * - Center text showing completion percentage
 * - Automatically syncs with the main progress bar
 * - Smooth animations during progress changes
 * - Works with dynamic slides and slide groups
 * - Handles conditional slide visibility
 *
 * Usage:
 * - Add an element with [data-fc-donut-container] attribute
 * - The donut will be automatically created and updated during navigation
 * - Customize appearance via CSS variables or data attributes
 *
 * Example:
 * <div data-fc-donut-container 
 *      data-fc-donut-size="80" 
 *      data-fc-donut-stroke-width="8"
 *      data-fc-donut-track-color="#f0f0f0"
 *      data-fc-donut-progress-color="#4a90e2"
 *      data-fc-donut-text-color="#333333"
 *      data-fc-donut-show-text="true">
 * </div>
 */

export class DonutProgress {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.donutContainer = null;
        this.donutCircle = null;
        this.donutText = null;
        this.circumference = 0;
        this.initialized = false;
        this.observer = null;
        this.currentPercent = 0;
        this.visibleSlides = [];
        this.totalVisibleSlides = 0;
    }

    /**
     * Initialize the donut progress indicator
     * Looks for a container with data-fc-donut-container attribute
     */
    init() {
        // Find container with the data attribute
        this.donutContainer = this.formChippy.container.querySelector('[data-fc-donut-container]');
        
        if (!this.donutContainer) {
            // Check if there's a container outside the form container
            this.donutContainer = document.querySelector('[data-fc-donut-container]');
            
            if (!this.donutContainer) {
                this.formChippy.debug.info('No donut progress container found. Donut progress will not be initialized.');
                return;
            }
        }
        
        this.formChippy.debug.info('Initializing donut progress indicator');
        this.createDonutProgress();
        this.initialized = true;
        
        // Set up event listeners for dynamic slide changes
        this._setupEventListeners();
        
        // Calculate initial visible slides
        this._updateVisibleSlides();
        
        // Set up mutation observer to detect slide visibility changes
        this._setupMutationObserver();
        
        // Initial update
        this.updateProgressFromCurrentSlide();
    }

    /**
     * Create the SVG-based donut progress indicator
     */
    createDonutProgress() {
        // Clear existing content
        this.donutContainer.innerHTML = '';
        
        // Get configuration from data attributes with defaults
        const size = parseInt(this.donutContainer.getAttribute('data-fc-donut-size') || '100');
        const strokeWidth = parseInt(this.donutContainer.getAttribute('data-fc-donut-stroke-width') || '8');
        const trackColor = this.donutContainer.getAttribute('data-fc-donut-track-color') || '#f0f0f0';
        const progressColor = this.donutContainer.getAttribute('data-fc-donut-progress-color') || '#4a90e2';
        const showText = this.donutContainer.getAttribute('data-fc-donut-show-text') !== 'false';
        const textColor = this.donutContainer.getAttribute('data-fc-donut-text-color') || '#333333';
        
        // Create the SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.setAttribute('data-fc-donut-svg', '');
        
        // Calculate dimensions
        const center = size / 2;
        const radius = (size - strokeWidth) / 2;
        this.circumference = 2 * Math.PI * radius;
        
        // Create the background track circle
        const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        track.setAttribute('cx', String(center));
        track.setAttribute('cy', String(center));
        track.setAttribute('r', String(radius));
        track.setAttribute('fill', 'none');
        track.setAttribute('stroke', trackColor);
        track.setAttribute('stroke-width', String(strokeWidth));
        track.setAttribute('data-fc-donut-track', '');
        
        // Create the progress circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(center));
        circle.setAttribute('cy', String(center));
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', progressColor);
        circle.setAttribute('stroke-width', String(strokeWidth));
        circle.setAttribute('stroke-dasharray', String(this.circumference));
        circle.setAttribute('stroke-dashoffset', String(this.circumference));
        circle.setAttribute('stroke-linecap', 'round');
        circle.setAttribute('transform', `rotate(-90 ${center} ${center})`);
        circle.setAttribute('data-fc-donut-circle', '');
        circle.style.transition = 'stroke-dashoffset 0.5s ease-in-out';
        
        // Add circles to SVG
        svg.appendChild(track);
        svg.appendChild(circle);
        
        // Create the text element if needed
        if (showText) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(center));
            text.setAttribute('y', String(center));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', String(size / 5));
            text.setAttribute('fill', textColor);
            text.setAttribute('data-fc-donut-text', '');
            text.textContent = '0%';
            svg.appendChild(text);
            this.donutText = text;
        }
        
        // Add SVG to container
        this.donutContainer.appendChild(svg);
        
        // Store references for future updates
        this.donutCircle = circle;
    }
    
    /**
     * Update the donut progress indicator
     * @param {number} percent - Progress percentage (0-100)
     */
    updateProgress(percent) {
        if (!this.initialized || !this.donutCircle) return;
        
        // Ensure percent is a number and within bounds
        percent = Math.max(0, Math.min(100, parseFloat(percent) || 0));
        
        // Store current percent for reference
        this.currentPercent = percent;
        
        // Update the text if it exists
        if (this.donutText) {
            this.donutText.textContent = `${Math.round(percent)}%`;
        }
        
        // Calculate the stroke-dashoffset based on the percentage
        const offset = this.circumference - (percent / 100) * this.circumference;
        
        // Apply the stroke-dashoffset to the circle
        this.donutCircle.style.strokeDashoffset = offset;
        this.donutCircle.setAttribute('stroke-dashoffset', String(offset));
        
        // Add a completed state when at 100%
        if (percent === 100) {
            this.donutContainer.classList.add('fc-donut-completed');
            if (this.donutText) {
                this.donutText.setAttribute('fill', this.donutCircle.getAttribute('stroke'));
            }
        } else {
            this.donutContainer.classList.remove('fc-donut-completed');
            if (this.donutText) {
                this.donutText.setAttribute('fill', 
                    this.donutContainer.getAttribute('data-fc-donut-text-color') || '#333333');
            }
        }
        
        this.formChippy.debug.info(`Donut progress updated to ${percent}%`);
    }
    
    /**
     * Update progress based on the current slide index
     * This calculates progress considering only visible slides
     */
    updateProgressFromCurrentSlide() {
        if (!this.initialized) return;
        
        // Make sure we have the latest visible slides
        this._updateVisibleSlides();
        
        // Calculate progress based on visible slides
        const currentIndex = this.formChippy.currentSlideIndex;
        let visibleIndex = 0;
        
        // Find the position of the current slide in the visible slides array
        for (let i = 0; i < this.visibleSlides.length; i++) {
            const slideIndex = this.formChippy.slides.indexOf(this.visibleSlides[i]);
            if (slideIndex === currentIndex) {
                visibleIndex = i;
                break;
            }
        }
        
        // Calculate percentage based on visible slides only
        const percent = this.totalVisibleSlides > 0 ? 
            ((visibleIndex + 1) / this.totalVisibleSlides) * 100 : 0;
        
        // Update the donut progress
        this.updateProgress(percent);
    }
    
    /**
     * Set up event listeners for dynamic slide changes
     * @private
     */
    _setupEventListeners() {
        // Listen for slide list updates
        this.formChippy.on('slidesListUpdated', () => {
            this._updateVisibleSlides();
            this.updateProgressFromCurrentSlide();
        });
        
        // Listen for slide navigation
        this.formChippy.on('slideChanged', (data) => {
            this.updateProgressFromCurrentSlide();
        });
    }
    
    /**
     * Set up mutation observer to detect slide visibility changes
     * This is important for handling slide groups that may be shown/hidden
     * @private
     */
    _setupMutationObserver() {
        // Create a mutation observer to watch for class changes on slide groups
        this.observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            
            for (const mutation of mutations) {
                // Check if the mutation is a class change
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    
                    // Check if the target is a slide group
                    if (target.hasAttribute('data-fc-slide-group')) {
                        needsUpdate = true;
                        break;
                    }
                }
            }
            
            if (needsUpdate) {
                this._updateVisibleSlides();
                this.updateProgressFromCurrentSlide();
            }
        });
        
        // Observe the slide list for class changes
        this.observer.observe(this.formChippy.slideList, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });
    }
    
    /**
     * Update the list of visible slides
     * This accounts for slide groups that may be hidden
     * @private
     */
    _updateVisibleSlides() {
        // Start with all slides
        const allSlides = Array.from(this.formChippy.slides);
        const visibleSlides = [];
        
        // Check each slide to see if it's visible (not in a hidden slide group)
        for (const slide of allSlides) {
            // Check if the slide is in a slide group
            const slideGroup = slide.closest('[data-fc-slide-group]');
            
            // If not in a group or the group is visible, add to visible slides
            if (!slideGroup || !slideGroup.classList.contains('hide')) {
                visibleSlides.push(slide);
            }
        }
        
        this.visibleSlides = visibleSlides;
        this.totalVisibleSlides = visibleSlides.length;
        
        this.formChippy.debug.info(`Visible slides updated: ${this.totalVisibleSlides} slides visible`);
    }
    
    /**
     * Clean up when destroying the form
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Remove event listeners
        this.formChippy.off('slidesListUpdated');
        this.formChippy.off('slideChanged');
        
        this.initialized = false;
    }
}
