export function data_applySavedFormData(savedData) {
    if (!savedData) return;
  
    Object.entries(savedData).forEach(([slideId, fields]) => {
      data_applySavedDataToSlide(slideId, fields);
    });
}
  
function data_applySavedDataToSlide(slideId, fields) {
    const slides = document.querySelectorAll(`[data-fc-slide="${slideId}"]`);
    if (!slides.length) return;
  
    slides.forEach((slide) => {
      const inputGroup = slide.querySelector('[data-fc-input-group]');
      if (!inputGroup) return;
  
      Object.entries(fields).forEach(([inputName, savedValue]) => {
        const radios = inputGroup.querySelectorAll(`input[name="${inputName}"]`);
        const texts = inputGroup.querySelectorAll(`input[data-input="${inputName}"]`);
        
        radios.forEach((input) => {
          if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = input.value === savedValue;
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
          }
        });
  
        texts.forEach((input) => {
          input.value = savedValue;
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        });
      });
    });
  }

  export function data_cloneForm(formName) {
    const originalForm = document.querySelector(`[data-fc-container="${formName}"]`);
    const targetContainer = document.querySelector(`[data-form-copy="${formName}"]`);
  
    if (!originalForm || !targetContainer) return;
    console.log(originalForm);
    console.log('TargetContainer', targetContainer)
    const clonedForm = originalForm.cloneNode(true); // Deep clone including children
    console.log('cloned',clonedForm)
    targetContainer.appendChild(clonedForm);
  }
  