/**
 * Progress.js
 * Handles progress indicators and navigation dots
 */

export class Progress {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.dots = [];
    }

    /**
     * Create navigation dots
     */
    createNavigationDots() {
        if (!this.formChippy.dotsContainer) return;

        // Clear existing dots
        this.formChippy.dotsContainer.innerHTML = '';

        // Create dots for each slide
        this.formChippy.slides.forEach((slide, index) => {
            const dot = document.createElement('div');
            dot.setAttribute('data-fc-dot', '');
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
            let progress;
            if (slideTracker) {
                // Use the position tracker for more accurate progress
                progress = ((slideTracker.currentIndex + 1) / totalSlides) * 100;
                this.formChippy.debug.info(`Progress updated from tracker: ${progress.toFixed(1)}%`, {
                    currentIndex: slideTracker.currentIndex,
                    totalSlides: totalSlides
                });
            } else {
                // Fallback to standard calculation
                progress = ((index + 1) / totalSlides) * 100;
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
