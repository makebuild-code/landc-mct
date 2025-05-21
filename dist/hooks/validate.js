export function validate_CurrentQuestion(questions,currentIndex) {
    const currentQuestion = questions[currentIndex];
    const inputGroup = currentQuestion.querySelector('[data-mbf-question-content]');
    const inputs = currentQuestion.querySelectorAll('input, select, textarea');
  
    let isAnswered = false;
  
    inputs.forEach(input => {
      const type = input.type;
      if (type === 'radio' || type === 'checkbox') {
        if (input.checked) isAnswered = true;
      } else if (input.value.trim() !== '') {
        isAnswered = true;
      }
    });
  
    if (!isAnswered) {
      // Add error styling
      inputGroup?.classList.add('error');
      const errorEl = currentQuestion.querySelector('[data-mbf-content-error]');
      if (errorEl) errorEl.style.display = 'flex';
    } else {
      // Clear error styling
      inputGroup?.classList.remove('error');
      const errorEl = currentQuestion.querySelector('[data-mbf-content-error]');
      if (errorEl) errorEl.style.display = 'none';
    }
  
    return isAnswered;
  }