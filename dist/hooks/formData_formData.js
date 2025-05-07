export function applySavedDataToSlide(slideId, savedData) {
    const slide = document.querySelector(`[data-fc-slide="${slideId}"]`);
    if (!slide) return;
  
    const inputGroup = slide.querySelector('[data-fc-input-group]');
    if (!inputGroup) return;
  
    const dataForSlide = savedData?.data?.[slideId];
    if (!dataForSlide) return;
  
    Object.entries(dataForSlide).forEach(([inputName, inputValue]) => {
      // Find all inputs matching the name
      const inputs = inputGroup.querySelectorAll(`[name="${inputName}"]`);
  
      inputs.forEach((input) => {
        const type = input.type;
  
        if (type === 'radio' || type === 'checkbox') {
          input.checked = input.value === inputValue;
        } else {
          input.value = inputValue;
        }
  
        // Optional: trigger a change event if your form has listeners
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }