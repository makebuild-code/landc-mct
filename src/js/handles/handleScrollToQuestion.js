import { calc_ElementSize } from "../hooks/calcs.js";

/**
 * Scrolls to the specified question element within a form container
 * @param {HTMLElement} targetQuestion - The question element to scroll to
 * @param {HTMLElement} container - The container element holding the questions
 * @param {number} index - The index of the question to mark as current
 * @param {Function} updateButtons - Optional callback to update navigation buttons
 * @param {boolean} animate - Whether to scroll smoothly
 * @returns {void}
 */

export function scrollToQuestion(targetQuestion, container, index, updateButtons, animate = true) {
  // Measure question height
  const questionHeight = calc_ElementSize(targetQuestion);
  const totalHeight = questionHeight.height + 20; // 20px padding top + bottom

  // Apply dynamic height and layout styling
  container.style.maxHeight = `${totalHeight}px`;
  container.style.paddingTop = '20px';
  container.style.paddingBottom = '20px';
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'hidden';

  // Reset any scroll styles
  targetQuestion.style.overflowY = '';
  targetQuestion.style.maxHeight = '';

  let scrollTop;

  if (questionHeight < container.clientHeight) {
    // Center the question
    scrollTop = targetQuestion.offsetTop - (container.clientHeight - questionHeight) / 2;
  } else {
    // Top align with padding
    scrollTop = targetQuestion.offsetTop - 20;

    // Enable internal scrolling for tall questions
    targetQuestion.style.overflowY = 'auto';
    targetQuestion.style.maxHeight = `${container.clientHeight - 40}px`;
  }

  container.scrollTo({
    top: scrollTop,
    behavior: animate ? 'smooth' : 'auto',
  });

  // Update buttons if provided
  if (typeof updateButtons === 'function') updateButtons();
}
