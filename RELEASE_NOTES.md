# FormChippy v1.5.2 Release Notes

## Enhancements
- **Real-time Validation Feedback**: Validation now runs on the `input` event for text-based fields (text, number, textarea, select) and `change` for clicks (radio, checkbox), providing immediate visual feedback as the user interacts with the form. This uses the existing `validateSlide()` logic but triggers it more frequently.
- **LocalStorage Mirroring**: When data persistence (`sessionStorage` or `localStorage`) is enabled, the internal `this.formData` object is now also stored as a JSON string under the key `formchippy-<formName>-json` in `localStorage`. This provides an easily accessible, human-readable view of the collected data for debugging purposes, regardless of the chosen persistence method.

## Bug Fixes
- (Inherited from v1.5.1) Corrected data storage for standard radio button groups to use the group `name` as the key and the selected radio's `value` as the value.
- (Inherited from v1.5.1) Fixed data handling for inputs nested within `[data-fc-element="radiofield"]` elements.

---

# FormChippy v1.5.1 Release Notes

## Bug Fixes
- Corrected data storage for standard radio button groups to use the group `name` as the key and the selected radio's `value` as the value (e.g., `{ "groupName": "selectedValue" }`), ensuring only the latest selection is stored.
- Fixed data handling for inputs nested within `[data-fc-element="radiofield"]` elements:
    - Ensured nested input data is correctly added/updated when the associated radio is selected.
    - Ensured nested input data is correctly removed when the associated radio becomes unselected.
- Added logic to `setupInputChangeListeners` to explicitly trigger updates for nested inputs in all related radiofields when a radio button selection changes.

---

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
