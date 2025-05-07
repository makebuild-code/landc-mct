export function table_renderResults(data, isEligable) {
    console.log('isEligable',isEligable)
    const templates = document.querySelectorAll('[data-fc-element="feed-item-template"]');
    const container = document.querySelector('[data-fc-element="feed-list"]');
  
    if (templates.length < 2 || !container || data.length === 0) return;
  
    const template1 = [...templates].find(t => t.classList.contains('is-1'));
    const template2 = [...templates].find(t => t.classList.contains('is-2'));
  
    if (!template1 || !template2) return;
  
    // Find the lowest rate
    const lowestRate = Math.min(...data.map(item => parseFloat(item.Rate)));
  
    data.forEach(item => {
      const useTemplate = parseFloat(item.Rate) === lowestRate ? template1 : template2;
      const clone = useTemplate.cloneNode(true);
      clone.style.height = 'auto';
      clone.style.opacity = 1;
  
      // Populate any [data-output-value] fields
      const outputFields = clone.querySelectorAll('[data-output-value]');
      outputFields.forEach(el => {
        const key = el.getAttribute('data-output-value');
        if (item.hasOwnProperty(key)) {
            if (el.tagName.toLowerCase() === 'img') {
                el.src = item[key];
              } else {
                el.textContent = item[key];
              }
        }
      });

      const buttonFields = clone.querySelectorAll('[data-button-apply]');
      buttonFields.forEach(button => {
        const applyType = button.getAttribute('data-button-apply');
        button.style.display = 'none';

        if (isEligable && applyType === 'eligible') {
          button.style.display = 'block';
        }  
        if (!isEligable && applyType === 'notEligible') {
            button.style.display = 'block';
        }
      });
  
      container.appendChild(clone);
    });
  }
  
  
  export function table_noResults(){
    const list = document.querySelector('[data-fc-element="feed-list"]');
    const empty = document.querySelector('[data-fc-element="feed-empty"]');
    list.style.height = 0;
    list.style.opacity = 0;
    list.style.overflow = 'hidden';

    empty.style.height = 'auto';
    empty.style.opacity = 1;
    empty.style.overflow = 'auto';

  }