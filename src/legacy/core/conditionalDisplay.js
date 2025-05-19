export class ConditionalDisplay {
    constructor(container, formChippy) {
        this.container = container;
        this.individualElements = [];
        this.state = {};

        this.formData = {}

        this.formChippy = formChippy
        this._init();
        
    }

    _init() {
        this._collectElements();
        this._applyInitialHides();
        this._setupInputListeners();
    }

    _applyInitialHides() {
        // Show master-identifier if no Saved Form Data on Load
        const hideInitialSlides = this.container.querySelectorAll('[data-slide-show=false]');
        
        if (!Object.keys(this.state).length) {
            hideInitialSlides.forEach((group, index) => {
               group.style.display = 'none';
            });

        } 

    }

    // -- REDUNDANT

    _setupInputListeners() {
        const inputs = this.container.querySelectorAll('[data-fc-slide] input, [data-fc-slide] select, [data-fc-slide] textarea');
        
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                //this.formChippy.navigation._collectFormData();
                //this.onChange() // Trigger conditional re-evaluation
            });
        });
    }

     // -- END REDUNDANT

    _parseString(string) {
        if (!string) return [];

        // More than One Condition
        if (string.includes('|')) {
            return string.split('|').map(cond => {

                const [key, value] = cond.split(':');

                if (!key || value === undefined) return null;

                return { key: key.trim(), value: value.trim() };

            }).filter(Boolean);
        }
    
        // Single condition
        const [key, value] = string.split(':');
        if (!key || value === undefined) return [];
        return [{ key: key.trim(), value: value.trim() }];
    }

    _collectElements() {
        this.individualElements = Array.from(
            this.container.querySelectorAll('[data-fc-if]')
        ).map(el => {
            const string = el.getAttribute('data-fc-if');
            const conditions = this._parseString(string);
            return conditions.length ? { el, conditions } : null;
        }).filter(Boolean);

    }

    _flattenData(nestedData) {
        const flat = {};

        for (const section of Object.values(nestedData)) {

            if (section && typeof section === 'object') {
                Object.assign(flat, section);
            }

        }
        return flat;
    }

    _evaluateConditions(conditions) {
        return conditions.every(({ key, value }) => this.state[key] === value);
    }

    update(newData) {
        if(newData){
            this.state = this._flattenData(newData);
            console.log(this.state);

            this.individualElements.forEach(({ el, conditions }) => {

                const shouldShow = this._evaluateConditions(conditions);
                if (shouldShow) {
                    el.style.display = '';
                    el.setAttribute('data-slide-show', true)
                } else {
                    el.style.display = 'none';
                    el.setAttribute('data-slide-show', false)
                }
            });

            if (this.formChippy) {
                const visibleSlides = Array.from(
                    this.container.querySelectorAll('[data-fc-slide][data-slide-show="true"]')
                );
                this.formChippy.slides = visibleSlides;
                this.formChippy.totalSlides = visibleSlides.length;
          
            }

        }
        
    }

    // External Class use for change 
    onChange() {
        const formName = this.formChippy.formName || this.formChippy.name;
            // Load
        const getForm = this.formChippy.persistence.loadFormData(formName);
        this.update(getForm);
    }

    reset() {
        this.individualElements.forEach(({ el }) => {
            el.style.display = 'none';
        });
        this._applyInitialVisibility();
    }

    destroy() {
        this.reset();
        this.individualElements = [];
        this.groupElements = [];
        this.state = {};
    }
}
