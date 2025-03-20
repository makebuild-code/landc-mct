# Things to do

## Features

-   disable states for nav buttons; prev and next disable class
-   slide grouping for progress bar via attributes for slides and progress bar to connect which slide group to which progress bar
-   curcular progress bar like a donut
-   validation per slide. check validation from API. connect with TypeScript guy.
-   go to slide attribute button
-   go to slide deppending on input
-   donut bar should work even if progress bar element is not present
-   if there is an error in the inputs of the content element, add `.error` class
-   by default during slide transition animation, don't take in other navigation requests to prevent errors

## Bug Fixes

### Examples with issues

-   **add-remove-slides-example.html**: Fix initialization issue with FormChippy when using module imports. The error "FormChippy is not defined" occurs because the module doesn't expose FormChippy globally.
-   **slide-groups-example.html**: Similar initialization issues as the add-remove-slides example.

### Root Cause & Solution Options

1. **Root Cause**: The examples are trying to manually initialize FormChippy after loading it as a module, but the constructor isn't available globally when loaded with `type="module"`.
2. **Solution Options**:
    - Use auto-initialization (like in basic-example.html)
    - Modify the import approach to correctly access the FormChippy constructor
    - Rewrite examples to use proper ES module imports
