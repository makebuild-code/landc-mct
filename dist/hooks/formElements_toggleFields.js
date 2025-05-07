export function toggleHiddenFields() {
    const elements = document.querySelectorAll('[data-output-hide]');
  
    elements.forEach((el) => {
        console.log('ELEMENT', el)
        el.style.opacity = '1';
        el.style.height = 'auto';
        el.style.overflow = 'visible'
    });
  }

  export function hideLoaders(spinnerName) {
    const elements = document.querySelector(`[data-fc-element=${spinnerName}]`);
    console.log(elements)
    elements.style.display = 'none'
  }