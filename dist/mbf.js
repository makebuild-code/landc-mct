/*!
 * MBFForm.js
 * JavaScript library for Mortgage Finder Form in Webflow.
 *
 * Features:
 * - Data-driven question visibility via data attributes
 * - Smooth JS-based slide navigation
 * - Centers questions in the viewport
 * - Handles questions taller than container with internal scrolling
 */


// Hooks
import { handleRadioInputChange } from "./handles/handleInputChanges.js";
import { handleConditionalVisibility, loadFormData, saveFormData } from "./handles/handleFormData.js";
import { scrollToQuestion } from "./handles/handleScrollToQuestion.js";
import { validate_CurrentQuestion } from "./hooks/validate.js";

export default class MBFForm {
    constructor() {
      // Grab form and container
      const formEl = document.querySelector('[data-mbf-form-name]');
      if (!formEl) {
        console.warn('MBFForm: No element found with [data-mbf-form-name]');
        return;
      }
      
      this.form = formEl;
      this.container = this.form.querySelector('[data-mbf-form-slug]') || this.form;
      this.container.style.overflowY = 'hidden';

      // Collect all question slides
      this.questions = Array.from(this.container.querySelectorAll('[data-mbf-question-slug]'));
      this.currentQuestionIndex = 0;
      this.state = {};

      // Action buttons
      this.prevButton = this.form.querySelector('[data-mbf-button-action="prev"]');
      this.nextButton = this.form.querySelector('[data-mbf-button-action="next"]');
      this.resultsButton = this.form.querySelector('[data-mbf-button-action="submit"]');
      this.loadingForm = this.form.querySelector('[data-mbf-form-loading="loader"]')

      // sizes
      

      // Initialise
      this.init();
    }

    init() {
      // Attach input listeners for dynamic visibility
      this.loadForm();
      this.hideInitialOnLoad()
      this.setupEventListeners();
      this.updateButtons()
      // Attach nav listeners
      this.prevButton?.addEventListener('click', () => this.prev());
      this.nextButton?.addEventListener('click', () => this.next());
      this.resultsButton?.addEventListener('click', () => this.goToSlide(this.getVisibleSlides().length - 1));
  
      // calculations
      this.windowResize();


      // Show first slide
    // this.goToSlide(0, false);
    }

    hideInitialOnLoad() {
      const groups = this.container.querySelectorAll('[data-mbf-group-name]');
      
      groups.forEach(group => {
        const shouldHide = group.getAttribute('data-mbf-hidden-onload') === 'false';
        if (shouldHide) {
          group.style.display = 'none';
        } else {
          group.style.display = ''; // reset to default
        }
      });
    }

    setupEventListeners(){
      this.container.addEventListener('click', e => {
        const clickedRadio = e.target.closest('input[type="radio"]');
        if (clickedRadio && this.container.contains(clickedRadio)) {
          const questionEl = clickedRadio.closest('[data-mbf-question-slug]');
          if (questionEl) {
            this.onInputChange({ target: clickedRadio }, questionEl);
          }
        }
      });
    
      // For other input types: direct change binding
      this.questions.forEach(q => {
        const inputs = q.querySelectorAll('input:not([type="radio"]), select, textarea');
        inputs.forEach(input => {
          input.addEventListener('change', e => this.onInputChange(e, q));
        });
      });
    }

    windowResize(){
      window.addEventListener('resize', () => {
        const containerHeight = this.container.clientHeight;
        // Re-center current question
        this.goToQuestion(this.currentQuestionIndex, false);
      });
    }

    onInputChange(event, questionEl) {
      const input = event.target;
    
      if (input.type === 'radio') {
        handleRadioInputChange(input, questionEl);
      }
      this.saveForm();
    
    }

    saveForm(){
      const data = saveFormData(this.container);
      handleConditionalVisibility(this.container, data); 
    }

    loadForm() {
      loadFormData(this.container);
      const saved = localStorage.getItem('MBF_FORM_DATA');
      if (saved) {
        const data = JSON.parse(saved);
        handleConditionalVisibility(this.container, data);
      }
    }


    getVisibleQuestions() {
      return this.questions.filter(q => {
        const style = window.getComputedStyle(q);
        return style.display !== 'none';
      });
    }

    updateButtons() {
      const slides = this.getVisibleQuestions();
      this.currentIndex = Math.max(0, Math.min(this.currentIndex, slides.length - 1));
      this.prevButton?.classList.toggle('hide', this.currentIndex === 0);
      this.nextButton?.classList.toggle('hide', this.currentIndex === slides.length - 1);
      this.resultsButton?.classList.toggle('hide', this.currentIndex !== slides.length - 1);
      this.loadingForm?.classList.toggle('hide', this.currentIndex === 0);
    }

    goToQuestion(index, animate = true) {
      if (index < 0 || index >= this.questions.length) return;
    
      const targetQuestion = this.questions[index];
    
      scrollToQuestion(
        targetQuestion,
        this.container,
        index,
        () => this.updateButtons?.(),
        animate
      );
    
      this.currentQuestionIndex = index;
    }

    next() {
      if(!validate_CurrentQuestion(this.questions,this.currentQuestionIndex)){
        return;
      }
      this.goToQuestion(this.currentQuestionIndex + 1);
    }

    prev() {
      if(!validate_CurrentQuestion(this.questions,this.currentQuestionIndex)){
        return;
      }
      this.goToQuestion(this.currentQuestionIndex - 1);
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => new MBFForm());
