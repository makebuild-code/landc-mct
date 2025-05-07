export function data_populateOutputValues(formData) {
    const divs = document.querySelectorAll('[data-output-value]');
  
    divs.forEach(div => {
      const key = div.getAttribute('data-output-value');
  
      if (formData.hasOwnProperty(key)) {
        console.log(key);
        div.textContent = formData[key];
      }
    });
  }