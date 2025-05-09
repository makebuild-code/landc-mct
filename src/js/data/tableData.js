let savedData = []  // full dataset
let renderOffset = 0
const renderLimit = 10

export function table_initRender(data, isEligible) {
    savedData = data
    renderOffset = 0

    localStorage.setItem('isEligable', isEligible);

    document.querySelector('[data-fc-element="feed-list"]').innerHTML = '' // clear existing

    table_renderResults(savedData.slice(renderOffset, renderOffset + renderLimit), isEligible)
    renderOffset += renderLimit

    toggleLoadMoreButton()
}

export function handleLoadMoreClick() {
    const nextChunk = savedData.slice(renderOffset, renderOffset + renderLimit)
    const getIsEligable = localStorage.getItem('isEligable');
    table_renderResults(nextChunk, getIsEligable)
    renderOffset += renderLimit

    toggleLoadMoreButton()
}

function toggleLoadMoreButton() {
    const loadMoreBtn = document.querySelector('[data-load-more]')
    if (!loadMoreBtn) return

    if (renderOffset >= savedData.length) {
        loadMoreBtn.style.display = 'none'
    } else {
        loadMoreBtn.style.display = 'block'
    }
}


function table_renderResults(data, isEligable) {


  const templates = document.querySelectorAll('[data-fc-element="feed-item-template"]');
  const container = document.querySelector('[data-fc-element="feed-list"]');

  if (templates.length < 2 || !container || data.length === 0) return;

  const template1 = [...templates].find(t => t.classList.contains('is-1'));
  const template2 = [...templates].find(t => t.classList.contains('is-2'));

  if (!template1 || !template2) return;

  let templateToggle = true; // used to alternate templates
  
  data.forEach(item => {
    const useTemplate = templateToggle ? template1 : template2;
    templateToggle = !templateToggle; // alternate between templates

    const clone = useTemplate.cloneNode(true);
    clone.style.height = 'auto';
    clone.style.opacity = 1;

    // Channel check: hide if Channel is 'Everyone'
    if (item.Channel === 'Everyone') {
      const channelElement = clone.querySelector('[data-output-value="Channel"]');
      if (channelElement) {
        channelElement.style.display = 'none';
      }else{
        el.textContent = item.Channel;
      }
    }



    // NewBuild check: hide ifNewbuild is ''
    if (item.NewBuild && item.NewBuild === '') {
      const newBuildElement = clone.querySelector('[data-output-value="NewBuild"]');
      if (newBuildElement) {
        newBuildElement.style.display = 'none';
      }
    }

    // Green SAP check: hide if SAP is 10 or less
    const sapElement = clone.querySelector('[data-output-value="SAP"]');
    if (item.SAP && item.SAP >= 10) {
      if (sapElement) {
        sapElement.style.display = 'none';
      }
    } else {
        sapElement.style.display = 'block';
    }

    // Set values for elements with data-output-value
    const outputFields = clone.querySelectorAll('[data-output-value]');
    outputFields.forEach(el => {
      const key = el.getAttribute('data-output-value');

      // Special case for SchemeFee
      if (key === 'SchemeFee') {
        const brokerFee = parseFloat(item.BrokerFee) || 0;
        const applicationFee = parseFloat(item.ApplicationFee) || 0;
        const schemeFee = brokerFee + applicationFee;

        el.textContent = schemeFee.toFixed(2); // or format as needed
        return;
      }

      if (key === 'NewBuild' || key === 'SAP') return;

      // Default output
      if (item.hasOwnProperty(key)) {
        if (el.tagName.toLowerCase() === 'img') {
          el.src = item[key];
        } else {

            el.textContent = item[key];
          
        }
      }
    });

    // Show correct apply button
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