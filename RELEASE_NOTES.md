# FormChippy v1.5.0 Release Notes

## Enhanced Form Validation System

### New Required/Optional Attribute System
- Implemented a cleaner, more hierarchical approach to form validation requirements
- Added support for `data-fc-required="false"` attribute to mark elements as not required (optional)
- The attribute can now be applied at multiple levels in the DOM hierarchy:
  - On slides: `<div data-fc-slide="1" data-fc-required="false">...</div>`
  - On content elements: `<div data-fc-content data-fc-required="false">...</div>`
  - On questions/fields: `<div data-fc-question data-fc-required="false">...</div>`
  - On labels: `<label data-fc-required="false">...</label>`
  - On individual inputs: `<input type="text" data-fc-required="false">`
  - On radio buttons: `<input type="radio" name="group" data-fc-required="false">`

### Unified Error Handling
- Created a consistent error handling system for all input types
- Implemented a unified `toggleContentError()` function that manages error states across different input types
- Applied consistent error class treatment to content elements (`data-fc-content`)
- Improved debug logging throughout the validation process

### Breaking Changes
- Removed support for the legacy `data-fc-optional` attribute 
- All optional fields must now use `data-fc-required="false"`

## Other Improvements
- Enhanced debugging across the validation system
- Fixed bug in radio group validation
- Improved code organization and reduced duplication

## Upgrading from 1.4.0
If you were using `data-fc-optional` in your forms, you'll need to replace those with `data-fc-required="false"`.

Example:
```html
<!-- Old (no longer supported) -->
<input type="text" name="nickname" data-fc-optional>

<!-- New (v1.5.0) -->
<input type="text" name="nickname" data-fc-required="false">
```

## Migration Tips
- You can now apply the optional status at higher levels in your form hierarchy
- Consider marking entire sections as not required rather than individual inputs
- Use the browser console to view detailed validation logs when troubleshooting
