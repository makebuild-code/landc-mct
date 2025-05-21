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

      // Summary
      this.summarySection = this.form.querySelector('[data-mbf-question-slug=summary]')

      // Action buttons
      this.prevButton = this.form.querySelector('[data-mbf-button-action="prev"]');
      this.nextButton = this.form.querySelector('[data-mbf-button-action="next"]');
      this.resultsButton = this.form.querySelector('[data-mbf-button-action="submit"]');
      this.loadingForm = this.form.querySelector('[data-mbf-form-loading="loader"]')
      this.loadingButtons = this.form.querySelector('[data-mbf-form-loading="buttons"]');

      this.resetForm = document.querySelector('[data-mbf-button-header-action]');
      this.resetFormText = document.querySelector('[data-mbf-header-button-text]');

      this.progressNumerator = document.querySelector('[data-mbf-progress-fraction=numerator]');
      this.progressDenominator = document.querySelector('[data-mbf-progress-fraction=denominator]');
      // Initialise
      this.init();
    }

    init() {
      // Attach input listeners for dynamic visibility
      this.loadForm();
      this.setFormInit();
      //this.setHideInitialOnLoad()
      this.setupEventListeners();
      this.updateButtons()
      // Attach nav listeners
      this.prevButton?.addEventListener('click', () => this.prev());
      this.nextButton?.addEventListener('click', () => this.next());
      this.resultsButton?.addEventListener('click', () => this.goToSlide(this.getVisibleSlides().length - 1));
      this.resetForm?.addEventListener('click', this.resetForm());
  
      // calculations
      this.windowResize();

      // Load Forms


      // [data-mbf-form-loading] - Buttons Wrapper
      // [data-mbf-form-slug]


      // Show first slide
    // this.goToSlide(0, false);
    }

    setFormInit(){

      // TODO: get formLoad Data and initialise handle - this.loadForm()
      if(this.questions.length > 0){
        this.setHideInitialOnLoad();

        this.container.classList.remove('hide');
        this.loadingButtons?.classList.remove('hide');

        setTimeout(() => {
          this.loadingForm?.classList.add('hide');
        }, 50);

        this.setInitialSizings();

        // Scroll to top wrapper offsetTop - 50px
        const topWrap = document.querySelector('.form-mbf_slide-list');
        const showSticky = document.querySelector('.form-mbf_detail-sticky-wrap')
        if (topWrap) {
          const offset = topWrap.offsetTop ;
          window.scrollTo({
            top: offset,
            behavior: 'smooth',
          });
          showSticky.classList.remove('hide');
        }
      }
    }

    setInitialSizings() {
      const firstVisible = this.getVisibleQuestions()[0];
      if (firstVisible) {
        scrollToQuestion(
          firstVisible,
          this.container,
          0,
          () => this.updateButtons?.(),
          false 
        );
      }
    }

    setHideInitialOnLoad() {
      const groups = this.container.querySelectorAll('[data-mbf-group-name]');
    
      groups.forEach(group => {
        const shouldHideQuestions = group.getAttribute('data-mbf-hidden-onload') === 'false';
    
        const questions = group.querySelectorAll('[data-mbf-question-slug]');
        
        questions.forEach(question => {
          question.style.display = shouldHideQuestions ? 'none' : '';
        });
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

      // Reset the questions list
      this.getVisibleQuestions();
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
    }

    goToQuestion(index, animate = true) {

      // revalidate number of questions

      const visibleQuestions = this.getVisibleQuestions();
      if (index < 0 || index >= visibleQuestions.length) return;
    
      const targetQuestion = visibleQuestions[index];
    
      scrollToQuestion(
        targetQuestion,
        this.container,
        index,
        () => this.updateButtons?.(),
        animate
      );
    
      this.currentQuestionIndex = index;
      this.progressNumerator = document.querySelector('[data-mbf-progress-fraction=numerator]');
      
      if (this.progressNumerator) {
        this.progressNumerator.textContent = this.currentQuestionIndex + 1;
      }
    
      if (this.progressDenominator) {
        this.progressDenominator.textContent = visibleQuestions.length;
      }
    }
    

    next() {
      const visibleQuestions = this.getVisibleQuestions();
      const currentQuestion = visibleQuestions[this.currentQuestionIndex];

      if (!validate_CurrentQuestion(visibleQuestions, this.currentQuestionIndex)) {
        return;
      }

      if (this.currentQuestionIndex === visibleQuestions.length) {

        this.submitForm();
      }
      
      this.currentQuestionIndex++;
      this.goToQuestion(this.currentQuestionIndex);
      
    }

    prev() {
      const visibleQuestions = this.getVisibleQuestions();
      const currentQuestion = visibleQuestions[this.currentQuestionIndex];

      if (!validate_CurrentQuestion(visibleQuestions, this.currentQuestionIndex)) {
        return;
      }

      this.currentQuestionIndex--;
      this.goToQuestion(this.currentQuestionIndex);
    }

    submitForm() {
      this.resultsButton.classList.remove('hide');
    }

    resetForm() {

      this.currentQuestionIndex = 0;
      
      localStorage.removeItem('MBF_FORM_DATA');
    
      const inputs = this.container.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });
    
      handleConditionalVisibility(this.container, {});
      
      const firstVisible = this.getVisibleQuestions()[0];
      if (firstVisible) {
        scrollToQuestion(
          firstVisible,
          this.container,
          0,
          () => this.updateButtons?.(),
          false // no animation on reset
        );
      }
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => new MBFForm());
