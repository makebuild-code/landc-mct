# Things to do

## Features

-   slide grouping for progress bar via attributes for slides and progress bar to connect which slide group to which progress bar
-   validation per slide
    -- check validation from API, connect with TypeScript person
    -- radiofield when error then selecting another radio from the same group, the error doesn't go away. so might be better to check radios per radio group or something.
    -- radiofield error doesn't go away when typing in the input child of the radiofield
-   go to slide attribute button
-   go to slide deppending on input
-   show slide group depending on input
-   query parameter to fill out inputs
-   JS API example of running code before and after slide navigation
-   JSON of input values to be sent to API
-   donut bar should work even if progress bar element is not present
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
