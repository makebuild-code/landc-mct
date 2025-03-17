/**
 * DonutProgress.js
 * Handles the circular/donut progress indicator for FormChippy
 *
 * Features:
 * - Circular progress visualization as an alternative to the linear progress bar
 * - Center text showing completion percentage
 * - Automatically syncs with the main progress bar
 * - Smooth animations during progress changes
 *
 * Usage:
 * - Add an element with [data-fc-donut-container] attribute
 * - The donut will be automatically created and updated during navigation
 * - Customize appearance via CSS variables
 *
 * Example:
 * <div data-fc-donut-container style="--donut-size: 80px; --donut-thickness: 8px;"></div>
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
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
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
}
