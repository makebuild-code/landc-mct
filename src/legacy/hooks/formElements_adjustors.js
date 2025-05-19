export function adjustor_showHiddenFields(toggle) {
  const elements = document.querySelectorAll('[data-output-hide]');

  elements.forEach(el => {
    const isHidden = el.getAttribute('data-visible') !== 'true';

    if (toggle === 'show') {
      // Show element
      el.style.height = 'auto';
      const fullHeight = el.scrollHeight + 'px';
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.overflow = 'hidden';

      void el.offsetWidth; // trigger reflow

      el.style.transition = 'opacity 1s ease, height 1s ease';
      el.style.height = fullHeight;
      el.style.opacity = '1';

      el.addEventListener('transitionend', () => {
        el.style.height = 'auto';
        el.style.overflow = 'visible';
      }, { once: true });

    } else {
      // Hide element
      const currentHeight = el.scrollHeight + 'px';
      el.style.height = currentHeight;
      el.style.opacity = '1';
      el.style.overflow = 'hidden';

      void el.offsetWidth; // trigger reflow

      el.style.transition = 'opacity 1s ease, height 1s ease';
      el.style.height = '0px';
      el.style.opacity = '0';

      el.addEventListener('transitionend', () => {
        el.style.overflow = 'hidden';
      }, { once: true });
    }
  });
}



  export function adjustor_hideLoaders(spinnerName) {
    const elements = document.querySelector(`[data-loading=${spinnerName}]`);
    console.log(elements)
    elements.style.display = 'none'
  }

  export function adjustor_groupLenders(formData){
    const lenderCount = {};

    formData.forEach(product => {
      const lender = product.LenderName;
      lenderCount[lender] = (lenderCount[lender] || 0) + 1;
    });
 
  
    return Object.keys(lenderCount).length;
  }

  export function adjustor_rateSorter(formData) {
    let lowestRate = Infinity;
  
    formData.forEach(product => {
      const rate = product.APR;
      if (rate < lowestRate) {
        lowestRate = rate;
      }
    });
  
    return lowestRate;
  }

  export function adjustor_formatNumberWithCommas(value) {
    const number = parseFloat(value);
    if (isNaN(number)) return value; 
    return number.toLocaleString('en-UK'); 
  }

  export function adjustor_syncForms(formData) {

    Object.keys(formData).forEach(key => {
      const allFields = document.querySelectorAll(`[data-name="${key}"]`);
  
      allFields.forEach(field => {
        const type = field.type;
       
  
        if (type === 'radio') {
          // Set the radio with the matching value to checked
          if (field.value === formData[key]) {
            field.checked = true;
          }
  
          // Add change listener to sync all radios in the group
          field.addEventListener('change', (e) => {
            if (e.target.checked) {
              const newValue = e.target.value;
              formData[key] = newValue;
  
              allFields.forEach(other => {
                other.checked = other.value === newValue;
              });
            }
          });
  
        } else {
          // Handle text, select, textarea
          field.value = formData[key];
  
          field.addEventListener('change', (e) => {
            const newValue = e.target.value;
            formData[key] = newValue;
  
            allFields.forEach(other => {
              if (other !== e.target) other.value = newValue;
            });
          });
        }
      });
    });
  }


  export function adjustor_resultSorter(result, key) {
    if (!Array.isArray(result) || !key) return result;
  
    return [...result].sort((a, b) => {
      const valA = parseFloat(a[key]);
      const valB = parseFloat(b[key]);
  
      if (isNaN(valA) || isNaN(valB)) return 0;
  
      return valA - valB; // Ascending (low to high)
    });
  }

  export function adjustor_showLoading(name, show){
    const container = document.querySelector(`[data-fc-form-loading="${name}"]`);

    container.style.display = show ? 'flex' : 'none';
  
  }

  export function adjustor_showElement(name, show) {
    const containers = document.querySelectorAll(`[data-fc-element="${name}"]`);
    
    containers.forEach(container => {
      container.style.display = show ? 'flex' : 'none';
    });
  }


  
  