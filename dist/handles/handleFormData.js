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
  
    questions.forEach(question => {
      const relateKey = question.getAttribute('data-mbf-relate-question-slug');
      const expected = question.getAttribute('data-mbf-relate-question-response');
  
      if (!relateKey || !expected) {
        question.style.display = ''; // Always show if not conditional
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
  