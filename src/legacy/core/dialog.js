export class DialogManager {
    constructor({ debug = false } = {}) {
      this.debug = debug;
      this.selectors = {
        instance: '[data-dialog-element="instance"]',
        components: '[data-dialog="component"]',
        openButton: '[data-dialog-element="open"]',
        dialogContainer: '[data-dialog-element="dialog-container"]',
        dialog: '[data-dialog-element="dialog"]',
        closeButton: '[data-dialog-element="close"]',
        statusAnnouncer: '#statusAnnouncer',
      };

  
      this.dialogState = {
        activeDialogInstance: null,
        lastActiveElement: null,
        focusableElements: [],
      };

      this._init();
    }
  
    debuglog(...args) {
      if (this.debug) {
        console.log('[DialogManager]', ...args);
      }
    }
  
    _init(){
      this.callDialogs();
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
  
    };

    // Allows to refresh dialogs
    callDialogs() {
        const dialogInstances = document.querySelectorAll(this.selectors.instance);
        const dialogComponent = document.querySelectorAll(this.selectors.components);
  
        dialogInstances.forEach(instance => {
            this.setupDialogInstance(instance);
        });

        dialogComponent.forEach(component => {
            this.setupDialogComponents(component);
        });
    }
  
    setupDialogInstance(instance) {
      const openButton = instance.querySelector(this.selectors.openButton);
      const dialogContainer = instance.querySelector(this.selectors.dialogContainer);
      const closeButtons = instance.querySelectorAll(this.selectors.closeButton);
  
      if (!openButton || !dialogContainer) {
        this.debuglog('Missing required elements for dialog instance', instance);
        return;
      }
  
      openButton.addEventListener('click', () => {
        this.openDialog(instance);
      });
  
      closeButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.closeDialog(instance);
        });
      });
    }
    closeAll() {
        dialogInstances.forEach(instance => {
            closeDialog(instance)
        })
    }

    openDialog(instance) {
      this.debuglog('Opening dialog', instance);
      this.dialogState.lastActiveElement = document.activeElement;
  
      const dialogContainer = instance.querySelector(this.selectors.dialogContainer);
      const dialog = dialogContainer.querySelector(this.selectors.dialog);
  
      if (!dialogContainer) {
        this.debuglog('Missing dialog elements', instance);
        return;
      }
  
      this.dialogState.activeDialogInstance = instance;
      dialogContainer.style.zIndex = '9999'
      dialogContainer.setAttribute('data-visible', 'true');
      //dialogContainer.setAttribute('aria-hidden', 'false');
  
      const customActiveClass =
        instance.getAttribute('data-dialog-classactive') || 'is-active';
      dialogContainer.classList.add(customActiveClass);
  
      //document.body.setAttribute('aria-hidden', 'true');
      this.dialogState.focusableElements = this.collectFocusableElements(dialog);
  
      if (this.dialogState.focusableElements.length > 0) {
        setTimeout(() => {
          this.dialogState.focusableElements[0].focus();
        }, 100);
      }
  
      /*this.announceToScreenReader('Dialog opened. Press Escape to close.');*/
    }
  
    closeDialog(instance) {
      this.debuglog('Closing dialog', instance);
  
      const dialogContainer = instance.querySelector(this.selectors.dialogContainer);
      if (!dialogContainer) {
        this.debuglog('Missing dialog container');
        return;
      }
  
      dialogContainer.setAttribute('data-visible', 'false');
      dialogContainer.setAttribute('aria-hidden', 'true');
  
      const customActiveClass =
        instance.getAttribute('data-dialog-classactive') || 'is-active';
      dialogContainer.classList.remove(customActiveClass);
  
      document.body.removeAttribute('aria-hidden');
  
      if (this.dialogState.lastActiveElement) {
        setTimeout(() => {
          this.dialogState.lastActiveElement.focus();
        }, 100);
      }
  
      this.dialogState.activeDialogInstance = null;
      this.dialogState.focusableElements = [];
  
      this.announceToScreenReader('Dialog closed');
    }
  
    handleKeyDown(event) {
      const instance = this.dialogState.activeDialogInstance;
      if (!instance) return;
  
      const dialogContainer = instance.querySelector(this.selectors.dialogContainer);
      const isDialogVisible = dialogContainer?.getAttribute('data-visible') === 'true';
      if (!isDialogVisible) return;
  
      switch (event.key) {
        case 'Escape':
          this.closeDialog(instance);
          event.preventDefault();
          break;
  
        case 'Tab':
          const focusable = this.dialogState.focusableElements;
          if (focusable.length === 0) return;
  
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
  
          if (event.shiftKey && document.activeElement === first) {
            last.focus();
            event.preventDefault();
          } else if (!event.shiftKey && document.activeElement === last) {
            first.focus();
            event.preventDefault();
          }
          break;
      }
    }
  
    collectFocusableElements(container) {
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll(selector)).filter(el =>
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        getComputedStyle(el).visibility !== 'hidden'
      );
    }
  
    announceToScreenReader(message) {
      const announcer = document.querySelector(this.selectors.statusAnnouncer);
      if (announcer) {
        announcer.textContent = message;
      }
    }
  }
  