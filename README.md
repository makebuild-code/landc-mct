# FormChippy

A lightweight, customizable multi-step form library built with vanilla JavaScript. FormChippy makes it easy to create interactive, multi-slide forms with validation, progress tracking, and smooth transitions.

## Features

- 🚶‍♂️ Multi-step form navigation
- 📊 Interactive progress indicator
- ✅ Built-in form validation
- 📱 Responsive & mobile-friendly
- 🎯 Navigation dots for quick access
- 🎨 Customizable styling
- 🔄 Smooth animations and transitions
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
    <!-- Progress indicator -->
    <div data-fc-progress>
        <!-- Progress structure will be created automatically -->
    </div>
    
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

Initialize FormChippy:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    window.formChippy = new FormChippy({
        containerSelector: '[data-fc-container="my-form"]',
        slideSelector: '[data-fc-slide]',
        progressSelector: '[data-fc-progress]',
        dotsSelector: '[data-fc-dots]',
        animationDelay: 500,
    });
});
```

## Examples

Check out the examples directory for complete implementations:
- basic-example.html: A simple multi-step form
- debug-example.html: Example with debug mode enabled

## License

MIT License
