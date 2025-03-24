# FormChippy

A lightweight, customizable multi-step form library built with vanilla JavaScript. FormChippy makes it easy to create interactive, vertical scrolling multi-slide forms with validation, progress tracking, and smooth transitions.

## Features

- 🚶‍♂️ Multi-step form navigation with chip-like experience
- 📊 Interactive progress indicators (linear and circular donut)
- ✅ Built-in form validation
- 📱 Responsive & mobile-friendly
- 🎯 Navigation dots for quick access
- 🎨 Customizable styling
- 🔄 Smooth animations and transitions
- 📋 Automatic form data collection
- ⚙️ Fully declarative API using data attributes
- 🔄 Configurable scroll behavior
- 📦 Support for nested slides at any DOM depth
- 🧠 Smart filtering of hidden slides
- 🚫 No dependencies

## Getting Started

Include the FormChippy CSS and JavaScript files in your HTML:

```html
<link rel="stylesheet" href="dist/css/formchippy.css">
<script src="dist/formchippy.js"></script>
```

Create your multi-step form with data attributes:

```html
<div data-fc-container="my-form">
    <!-- Linear progress indicator -->
    <div data-fc-progress>
        <!-- Progress structure will be created automatically -->
    </div>
    
    <!-- Optional: Donut progress indicator will be added automatically -->
    <!-- It syncs with the linear progress indicator -->
    
    <!-- Navigation dots -->
    <div data-fc-dots></div>
    
    <!-- Slide 1 -->
    <div data-fc-slide="intro">
        <div data-fc-content>
            <h2>Welcome!</h2>
            <p>Let's get started with this multi-step form.</p>
            <div class="fc-button-group">
                <button data-fc-button="next">Start</button>
            </div>
        </div>
    </div>
    
    <!-- Additional slides... -->
</div>
```

### Auto-Initialization (Default Behavior)

FormChippy automatically initializes on page load by detecting elements with the standard `data-fc-*` attributes. Simply including the library is sufficient:

```html
<script type="module" src="dist/formchippy.js"></script>
```

### Manual Initialization (Optional)

For custom configurations, you can manually initialize FormChippy:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    window.formChippy = new FormChippy({
        containerSelector: '[data-fc-container="my-form"]',
        slideSelector: '[data-fc-slide]',
        progressSelector: '[data-fc-progress]',
        dotsSelector: '[data-fc-dots]',
        animationDelay: 500,
        scrollPosition: 'center', // Options: 'start', 'center', 'end', 'nearest'
        validateByDefault: true,
        autoInitialize: false, // Set to false when manually initializing
    });
});
```

## Nested Slides Support

FormChippy provides comprehensive support for nested slides at any DOM depth, offering maximum flexibility in form structure:

### Key Features

- **Deep DOM Nesting**: Slides can be nested at any level within the slide-list container
- **Automatic Detection**: All slides are detected regardless of their nesting level
- **Smart Filtering**: Slides with ancestors that have `display: none` are automatically excluded from navigation
- **Improved User Experience**: Only visible slides are included in the navigation flow

### Example Structure

```html
<div data-fc-container="nested-demo">
    <div data-fc-slide-list>
        <!-- Regular slide at root level -->
        <div data-fc-slide="slide1" data-nesting="0">
            <div data-fc-content>
                <h2>Slide 1 (Root Level)</h2>
                <!-- Content here -->
            </div>
        </div>
        
        <!-- Nested container -->
        <div class="nested-container">
            <!-- Nested slide (level 1) -->
            <div data-fc-slide="slide2" data-nesting="1">
                <div data-fc-content>
                    <h2>Slide 2 (Nested Level 1)</h2>
                    <!-- Content here -->
                </div>
            </div>
            
            <!-- Another nesting level -->
            <div class="deeply-nested">
                <!-- Deeply nested slide (level 2) -->
                <div data-fc-slide="slide3" data-nesting="2">
                    <div data-fc-content>
                        <h2>Slide 3 (Nested Level 2)</h2>
                        <!-- Content here -->
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Hidden container that will be excluded from navigation -->
        <div class="hidden-container" style="display: none;">
            <!-- This slide will be automatically excluded from navigation -->
            <div data-fc-slide="hidden-slide">
                <div data-fc-content>
                    <h2>Hidden Slide</h2>
                    <!-- This slide won't be included in navigation -->
                </div>
            </div>
        </div>
    </div>
</div>
```

### How Hidden Slide Filtering Works

FormChippy automatically checks each slide's ancestors for visibility:

1. When initializing, it inspects each slide's parent elements up to the slide-list container
2. If any ancestor has `display: none`, the slide is excluded from navigation
3. This ensures users only navigate through slides that are actually visible
4. No additional configuration is needed - this behavior works automatically

Check out `nested-slides-example.html` in the examples directory for a complete demonstration.

## FormChippy Events

FormChippy provides a rich event system that you can use to integrate with your code:

### Initialization Event

```javascript
// Listen for FormChippy initialization
document.addEventListener('formchippy:init', function(event) {
    // The FormChippy instance is available in the event detail
    const formchippy = event.detail.instance;
    
    // Check if this is the instance we want (when using multiple forms)
    if (formchippy.formName === 'my-form-name') {
        console.log('FormChippy initialized successfully!');
        // Your code here
    }
});
```

### Slide Change Event

```javascript
// Get the FormChippy instance
const formchippy = window.FormChippy.getInstance('my-form-name');

// Listen for slide changes
formchippy.on('slideChange', function(data) {
    console.log(`Navigated to slide: ${data.currentSlideIndex}`);
    // Your code here
});
```

## Examples

Check out the examples directory for complete implementations:
- basic-example.html: A simple multi-step form
- basic-wf-example.html: Webflow integration example
- debug-example.html: Example with debug mode enabled
- nested-slides-example.html: Demonstration of nested slides and hidden slide filtering

## Supported Input Types

FormChippy supports various input types out of the box:
- Text input
- Radio input
- Toggle input
- File input
- Textarea input
- Date input

## Progress Indicators

FormChippy provides two types of progress indicators:

1. **Linear Progress Bar**: The traditional horizontal progress indicator
2. **Donut Progress Indicator**: A circular progress indicator positioned in the top-right corner that:
   - Displays percentage in the center
   - Syncs automatically with the linear progress bar
   - Features smooth transitions between states
   - Implemented with vanilla JavaScript and CSS

## License

MIT License
