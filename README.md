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

## Examples

Check out the examples directory for complete implementations:
- basic-example.html: A simple multi-step form
- basic-wf-example.html: Webflow integration example
- debug-example.html: Example with debug mode enabled

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
