/**
 * Handles visual state updates when a radio input changes
 * @param {HTMLInputElement} input - The radio input element that triggered the change
 * @param {HTMLElement} questionEl - The parent question element containing the radios
 */

export function handleRadioInputChange(input, questionEl) {
    // First remove 'checked' class from all radio wrappers in this question
    const allRadios = questionEl.querySelectorAll('[data-mbf-element="radio"]');
    allRadios.forEach(wrapper => {
      wrapper.classList.remove('checked');
  
      // Also hide any icon wraps inside unselected radios
      const iconWrap = wrapper.querySelector('[data-mbf-element="radio-icon-wrap"]');
      if (iconWrap) {
        iconWrap.style.display = 'none';
        iconWrap.style.opacity = '0';
        iconWrap.style.width = '0';
      }
    });
  
    // Add 'checked' class to the selected one
    const wrapper = input.closest('[data-mbf-element="radio"]');
    if (wrapper) {
      wrapper.classList.add('checked');
  
      // Reveal the associated icon wrap
      const iconWrap = wrapper.querySelector('[data-mbf-element="radio-icon-wrap"]');
      if (iconWrap) {
        iconWrap.style.display = 'flex';
        iconWrap.style.opacity = '1';
        iconWrap.style.width = '2em';
      }
    }
  }
  