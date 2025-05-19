export function calc_ElementSize(container) {
  if (!container || !(container instanceof Element)) {
    console.warn('getFormContainerSize: container must be a valid DOM Element');
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