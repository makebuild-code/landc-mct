export function saveFormData(container) {
    const data = {};
  
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const name = input.name || input.getAttribute('data-input');
      if (!name) return;
  
      if (input.type === 'radio' || input.type === 'checkbox') {
        if (input.checked) {
          data[name] = input.value;
        }
      } else {
        data[name] = input.value;
      }
    });
  
    localStorage.setItem('MBF_FORM_DATA', JSON.stringify(data));
    return data
  }


  export function loadFormData(container) {
    const saved = localStorage.getItem('MBF_FORM_DATA');
    console.log('FORM SAVED', saved)
    if (!saved) return;
  
    const data = JSON.parse(saved);
    Object.entries(data).forEach(([key, value]) => {
      const inputs = container.querySelectorAll(`[name="${key}"], [data-input="${key}"]`);
  
      inputs.forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
          input.checked = input.value === value;
        } else {
          input.value = value;
        }
      });
    });
  }


  export function handleConditionalVisibility(container, formData) {
    const questions = container.querySelectorAll('[data-mbf-question-slug]');
    const resetFormText = document.querySelector('[data-mbf-header-button-text]');

  
    questions.forEach(question => {
      const slug = question.getAttribute('data-mbf-question-slug');
  
      const relateKey = question.getAttribute('data-mbf-relate-question-slug');
      const expected = question.getAttribute('data-mbf-relate-question-response');
  
      const overrideKey = question.getAttribute('data-mbf-question-override-slug');
      const overrideValue = question.getAttribute('data-mbf-question-override-response');
  

      const purchaseType = formData['purchase-type'];
      if (purchaseType && resetFormText) {
        const formatted = purchaseType.charAt(0).toUpperCase() + purchaseType.slice(1);
        resetFormText.textContent = formatted;
      }


      // Check for override logic first
      if (overrideKey && overrideValue && formData[overrideKey] === overrideValue) {
        question.style.display = 'none';
        console.log(`Question [${slug}] hidden by override (${overrideKey}=${overrideValue})`);
        return;
      }
  
      // Then check for normal visibility
      if (!relateKey || !expected) {
        question.style.display = ''; // Show if no condition
        return;
      }
  
      const actual = formData[relateKey];
      if (actual === expected) {
        question.style.display = '';
      } else {
        question.style.display = 'none';
      }
    });
  }
  
  