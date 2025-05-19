export function calc_ElementSize(selector) {
    const container = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;
  
    if (!container) {
      console.warn(`No container found for selector: ${selector}`);
      return null;
    }
  
    const rect = container.getBoundingClientRect();
  
    return {
      element: container,
      height: rect.height,
      width: rect.width,
      top: rect.top + window.scrollY,
      rect,
    };
  }