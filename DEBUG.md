# FormChippy Debug Manager

The FormChippy Debug Manager provides comprehensive logging and troubleshooting capabilities for developers working with the FormChippy multi-step form library. This document explains how to enable, configure, and use the debugging features.

## Enabling the Debug Manager

### Basic Setup

To enable debugging, add the `data-fc-debuglog` attribute to your FormChippy container:

```html
<div data-fc-container="myForm" data-fc-debuglog="true">
  <!-- Form content -->
</div>
```

This simple addition activates the Debug Manager with default settings.

### Configuration Options

The Debug Manager can be customized through additional data attributes:

| Attribute | Purpose | Values | Default |
|-----------|---------|--------|---------|
| `data-fc-debuglog` | Main switch to enable/disable debugging | `"true"` or `"false"` | `"false"` |
| `data-fc-debuglog-console` | Controls console output | `"true"` or `"false"` | `"true"` when debugging is enabled |
| `data-fc-debuglog-ui` | Controls visual debug panel | `"true"` or `"false"` | `"true"` when debugging is enabled |
| `data-fc-debuglog-level` | Sets minimum log level | `"debug"`, `"info"`, `"warn"`, `"error"` | `"debug"` |
| `data-fc-debuglog-position` | Sets the initial position of the debug panel | `"top-right"`, `"top-left"`, `"bottom-right"`, `"bottom-left"` | `"bottom-right"` |

### Example with All Options

```html
<div 
  data-fc-container="myForm" 
  data-fc-debuglog="true"
  data-fc-debuglog-console="true"
  data-fc-debuglog-ui="true"
  data-fc-debuglog-level="debug"
  data-fc-debuglog-position="bottom-right">
  <!-- Form content -->
</div>
```

## Debug Panel UI

When the UI option is enabled, the Debug Manager creates a draggable panel displaying logs organized by type:

- **Debug (blue)**: General debugging information
- **Info (green)**: Important events and state changes
- **Warning (orange)**: Potential issues that don't prevent functionality
- **Error (red)**: Critical issues that may impact form function

### Debug Panel Controls

The debug panel includes several interactive controls:

- **Toggle Button**: Collapse/expand the panel
- **Clear Button**: Remove all current logs
- **Copy Button**: Copy all logs to clipboard
- **Drag Handle**: Click and drag to reposition the panel

## Programmatic Access

For advanced use cases, you can access the Debug Manager through JavaScript:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Get form instance
  const form = window.formChippy.getInstance('myForm');
  
  // Access the Debug Manager methods
  form.debug.log('Debug message', { some: 'data' });
  form.debug.info('Information message');
  form.debug.warn('Warning message');
  form.debug.error('Error message');
  
  // Control the debug panel
  form.debug.setLogLevel('info');    // Only show info, warn, and error logs
  form.debug.enableConsole(false);   // Disable console output
  form.debug.enableUI(true);         // Enable UI panel
  form.debug.clearLogs();            // Clear all logs
  form.debug.showPanel();            // Show the panel if hidden
  form.debug.hidePanel();            // Hide the panel
}); 
```

## Debug Events

The Debug Manager logs the following key events:

### Initialization
- Library initialization with configuration options
- Element detection results
- Component initialization status

### Navigation
- Slide changes with previous and current indices
- Button clicks
- Keyboard navigation events

### Validation
- Validation attempts
- Validation errors for each input
- Validation success

### Form Data
- Input changes
- Current form data state
- Final form data on submission

### Submission
- Submission attempts
- Submission success or failure
- Data sent to server

## Example Use Cases

### Debugging Navigation Issues

If users are unable to proceed to the next slide:

1. Enable the Debug Manager
2. Check validation logs for specific errors
3. Verify that required inputs are properly marked

### Troubleshooting Missing Form Data

If form data is incomplete or incorrect:

1. Check input change logs to see what values are being captured
2. Verify that inputs have proper name attributes
3. Check for validation issues that might prevent data collection

### Inspecting DOM Structure Issues

If elements aren't appearing correctly:

1. Review initialization logs for detection errors
2. Check for missing data attributes
3. Verify that DOM structure matches requirements

## Tips for Effective Debugging

1. **Start with Everything Enabled**: Begin with all debug options turned on
2. **Focus on Log Levels**: Once you identify the issue category, adjust log level for clarity
3. **Use UI Panel for Dynamic Testing**: Keep the panel open during interactive testing
4. **Console Logs for Development**: Use console logs when working in the developer tools
5. **Disable in Production**: Always disable debugging in production environments

## Common Issues and Solutions

| Issue | Check Debug For | Typical Solution |
|-------|----------------|------------------|
| Slides not advancing | Validation errors | Fix input requirements |
| Missing form data | Input change logs | Add proper name attributes |
| UI elements not appearing | Initialization errors | Check data attributes |
| Form not submitting | Submission errors | Fix validation issues |

With the Debug Manager, you can quickly identify and resolve issues in your FormChippy implementation, saving time and ensuring a smooth user experience.
