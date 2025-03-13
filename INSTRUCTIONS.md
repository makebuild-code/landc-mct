# FormChippy.js - Developer Instructions

## Project Overview

FormChippy is a custom JavaScript library for creating smooth, vertical, multi-step form experiences. Designed specifically for the L&C Mortgage Finder project, it implements a Typeform-like scrolling interaction with question validation and themeable styling.

**Primary Use Case:** FormChippy is built primarily for Webflow developers who need a simple way to add sophisticated multi-step form functionality to their projects without advanced JavaScript knowledge. By simply including the library via CDN and adding custom data attributes to their HTML elements, developers can create a polished form experience.

The library will support:

-   Vertical scroll snapping between questions
-   Next/previous button navigation
-   Validation before progressing
-   Progress indicator and navigation dots
-   Accessible, mobile-friendly design
-   Custom styling based on MCT token variables
-   Multiple question types: text inputs, radio groups, toggles, etc.
-   Form data collection and submission

This project is part of a larger multi-company theming system where different partners (L&C, Money Supermarket, etc.) will use the same form with different visual themes.

## Setup Instructions

### Webflow Integration (Primary Method)

For Webflow developers:

1. Include the FormChippy library via CDN:

    ```html
    <!-- Add to the <head> section in Webflow's Custom Code panel -->
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/youraccount/formchippy@latest/dist/formchippy.min.css"
    />

    <!-- Add before the </body> tag in Webflow's Custom Code panel -->
    <script src="https://cdn.jsdelivr.net/gh/youraccount/formchippy@latest/dist/formchippy.min.js"></script>
    ```

2. Add custom data attributes to your Webflow elements:

    - Create a div with `data-fc-container="formName"` attribute
    - Add sections with `data-fc-slide` for each question
    - Add content divs with `data-fc-content`
    - Create inputs with `data-fc-input`
    - Add buttons with `data-fc-button`
    - Add progress elements with `data-fc-progress` and `data-fc-dots`

3. No additional JavaScript is required - FormChippy automatically initializes based on the presence of these data attributes.

### For Library Developers

If you're developing or modifying the FormChippy library:

```
/formchippy/
├── dist/
│   ├── formchippy.js       # Production JS (minified)
│   └── formchippy.css      # Production CSS (minified)
├── src/
│   ├── js/
│   │   ├── core/           # Core functionality
│   │   │   ├── navigation.js
│   │   │   ├── validation.js
│   │   │   └── progress.js
│   │   ├── questions/      # Question type handlers
│   │   │   ├── text.js
│   │   │   ├── radio.js
│   │   │   └── toggle.js
│   │   └── formchippy.js   # Main entry point
│   └── css/
│       ├── tokens/         # CSS variables/tokens
│       │   ├── base.css
│       │   ├── lc.css      # L&C theme
│       │   └── msm.css     # Money Supermarket theme
│       ├── components/     # Component styles
│       └── formchippy.css  # Main entry point
└── examples/
    └── index.html          # Example implementation
```

Development setup:

1. Clone the repository:

    ```
    git clone [repo-url]
    cd formchippy
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Development build (with watch):

    ```
    npm run dev
    ```

4. Production build:

    ```
    npm run build
    ```

5. Run example:
    ```
    npm run example
    ```

## Usage

### Webflow Implementation

FormChippy is designed to be as simple as possible for Webflow developers:

1. **Basic Structure:** Create your form in Webflow using Divs and custom attributes:

```html
<!-- Progress bar -->
<div data-fc-progress></div>

<!-- Navigation dots -->
<div data-fc-dots></div>

<!-- Main form container -->
<div data-fc-container="mortgageFinder">
    <!-- Slide 1 -->
    <section data-fc-slide>
        <div data-fc-content>
            <h2 data-fc-slide-title>What's your name?</h2>
            <p data-fc-description>
                We need this for your mortgage application.
            </p>
            <input type="text" data-fc-input name="fullName" required />
            <button data-fc-button>Continue</button>
        </div>
    </section>

    <!-- Additional slides follow the same pattern -->
</div>
```

2. **Zero Configuration:** No JavaScript knowledge is required - simply add the data attributes to your elements, and FormChippy will automatically handle everything.

3. **Styling Integration:** Use Webflow's design panel to style your elements. FormChippy adds minimal styling to ensure the scrolling behavior works properly but leaves most visual styling to your Webflow classes.

### Key Attributes for Webflow Developers

| Attribute                      | Purpose              | Where to Add                                |
| ------------------------------ | -------------------- | ------------------------------------------- |
| `data-fc-container="formName"` | Main container       | Outer Div containing all slides             |
| `data-fc-slide`                | Individual slide     | Section element for each question           |
| `data-fc-content`              | Content wrapper      | Div inside each slide                       |
| `data-fc-slide-title`          | Question title       | H2 or other heading element                 |
| `data-fc-description`          | Question description | Paragraph element                           |
| `data-fc-input`                | Form input           | Input elements (text, email, number, radio) |
| `data-fc-button`               | Navigation button    | Button element to continue                  |
| `data-fc-submit`               | Submit button        | Add to final button                         |
| `data-fc-progress`             | Progress indicator   | Empty Div outside main container            |
| `data-fc-dots`                 | Navigation dots      | Empty Div outside main container            |

### Debugging Tools

FormChippy includes a powerful debugging system to help you during development and testing:

1. **Enable debugging** by adding the `data-fc-debuglog` attribute to your container:

```html
<div data-fc-container="mortgageFinder" data-fc-debuglog="true">
  <!-- Form content -->
</div>
```

2. **Additional debug options:**

| Attribute | Purpose | Example |
|-----------|---------|--------|
| `data-fc-debuglog-console` | Control console output | `data-fc-debuglog-console="true"` |
| `data-fc-debuglog-ui` | Enable visual debug panel | `data-fc-debuglog-ui="true"` |
| `data-fc-debuglog-level` | Set minimum log level | `data-fc-debuglog-level="debug"` |

The debug panel shows detailed information about:
- Form initialization
- Slide navigation
- Validation results
- Form data collection
- Submission attempts

### Advanced Usage (If Needed)

If you need to customize behavior beyond what the attributes provide, use the JavaScript API:

```javascript
// Add this to the Custom Code section in Webflow (before </body>)
<script>
  // Wait for FormChippy to initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Get form instance
    const form = window.formChippy.getInstance('mortgageFinder');

    // Example: Jump to a specific slide when a custom button is clicked
    document.querySelector('#jumpToLastQuestion').addEventListener('click', function() {
      form.goToSlide(form.getTotalSlides() - 1);
    });

    // Access debug functionality programmatically
    form.debug.info('Custom info message', { custom: 'data' });
    form.debug.setLogLevel('debug'); // Set to debug, info, warn, or error
    form.debug.clearLogs(); // Clear all logs

    // Example: Handle form submission
    document.addEventListener('formchippy:submit', function(event) {
      const { formName, formData } = event.detail;

      // Send data to your backend
      fetch('/submit-form', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
    });
  });
</script>
```

## Additional Notes

### For Webflow Developers

1. **No-Code Implementation**

    - FormChippy works directly with Webflow's visual editor
    - You can design and build your form visually, then add the data attributes
    - No need to write JavaScript or CSS yourself

2. **Multiple Forms Per Page**

    - You can have multiple FormChippy forms on a single page
    - Just give each a unique name in the `data-fc-container="uniqueName"` attribute

3. **Common Question Types in Webflow**

    **Text Input:**

    ```html
    <label>First Name</label>
    <input type="text" data-fc-input name="firstName" required />
    ```

    **Radio Buttons:**

    ```html
    <div class="radio-group">
        <label>
            <input
                type="radio"
                name="propertyType"
                value="house"
                data-fc-input
            />
            House
        </label>
        <label>
            <input
                type="radio"
                name="propertyType"
                value="flat"
                data-fc-input
            />
            Flat
        </label>
    </div>
    ```

    **Select Dropdown:**

    ```html
    <select data-fc-input name="loanTerm">
        <option value="">Please select</option>
        <option value="5">5 years</option>
        <option value="10">10 years</option>
        <option value="15">15 years</option>
    </select>
    ```

4. **Responsive Design**
    - FormChippy is fully responsive out of the box
    - Works well on mobile, tablet, and desktop
    - Use Webflow's responsive design tools as normal

### For Library Developers

1. **Core Requirements**

    - Each question must be full-height (100vh)
    - Smooth scrolling between questions using CSS scroll snap
    - Validation preventing progression if inputs are invalid
    - Support for different validation types (required, email, min/max, etc.)
    - Next/previous buttons for guided navigation
    - Progress bar and navigation dots
    - Theming via CSS variables

2. **Browser Support**

    - Chrome, Firefox, Safari, Edge (latest 2 versions)
    - iOS Safari and Android Chrome (latest 2 versions)

3. **Performance Considerations**

    - CSS transitions for animations (avoid JS animations)
    - Optimize scroll performance on mobile devices
    - Lazy initialization of distant slides
    - Minify production code

4. **Code Quality Standards**
    - Use ES6+ features with appropriate polyfills
    - Follow modern JavaScript best practices
    - Document all public methods and options
    - Provide useful error messages in the console
    - Implement proper error handling
    - Use consistent naming conventions

### MCT Token System for Themeable Components

The library uses CSS variables with an `--mct-` prefix for themeable elements to support the multi-company theming system:

```css
:root {
    /* Base MCT tokens */
    --mct-primary-color: #3f51b5;
    --mct-primary-hover: #303f9f;
    --mct-text-color: #333333;
    --mct-text-secondary: #666666;
    --mct-border-color: #dddddd;
    --mct-background-light: #f9f9f9;
    --mct-background-dark: #f3f3f3;
    --mct-error-color: #ff3860;
}

/* Example of Money Supermarket theme */
[data-theme='msm'] {
    --mct-primary-color: #ff9900;
    --mct-primary-hover: #e68a00;
    /* Other token overrides */
}
```

To apply a theme, simply add the `data-theme` attribute to the container:

```html
<div data-fc-container="mortgageFinder" data-theme="msm">
    <!-- Form content -->
</div>
```

This approach allows seamless theme switching without changing the HTML structure or JavaScript functionality.

---

FormChippy is designed to make implementing complex, multi-step forms as simple as possible for Webflow developers while maintaining the flexibility and power that professional developers might need for customization. By focusing on custom data attributes, the library embraces a no-code approach that aligns with Webflow's visual development philosophy.
