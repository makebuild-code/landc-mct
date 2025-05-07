import { getProductsMCT } from "../apis/api_ProductsMCTHttpTrigger.js";
import { flattenData } from "../data/flattenData.js";
import { data_populateOutputValues } from "../data/outputData.js";
import { table_noResults, table_renderResults } from "../data/tableData.js";
import { adjustor_formatNumberWithCommas, adjustor_groupLenders, adjustor_hideLoaders, adjustor_rateSorter, adjustor_resultSorter, adjustor_showHiddenFields, adjustor_syncForms } from "./formElements_adjustors.js";

export async function submitProducts(formData) {
    
    const flattenForm = flattenData(formData);

    // -- Update the Outputs in Webflow:
  
    console.log('FLATTEN', flattenForm);

    /*
    "input": {
        "PropertyValue": INT,
        "RepaymentValue": INT,
        "PropertyType": PropertyType // Enum - INT - valid values - house (1) or flat (2),
        "MortgageType": MortgageType // Enum - INT - valid values - Residential (1) or Buy to Let (2),
        "InterestOnlyValue": INT,
        "TermYears": INT,
        "SchemePurpose": SchemePurpose // Enum - INT - valid values - Purchase (1) or Remortgage (2),
        "SchemePeriods": [ // SchemePeriod Enum Array
            "1", // 1 = 2 years
            "2", // 2 = 3 years
            "3", // 3 = 5 years
            "4"  // 4 = 5+ years
        ],
        "SchemeTypes": [ // SchemeType Enum Array
            "1", // 1 = Fixed
            "2"  // 2 = Variable
        ],
        "NumberOfResults": INT,
        "Features": { // Features object
            "HelpToBuy": BOOLEAN,
            "Offset": BOOLEAN,
            "EarlyRepaymentCharge": BOOLEAN,
            "NewBuild": BOOLEAN
        },
        "SortColumn":  SortColumn // Enum - INT
        // Valid Values:
        // Rate = 1
        // AverageAnnualCost = 2
        // MaxLTV = 3
        // MonthlyPayment = 4
        // Lender = 5
        // Fees = 6
        "UseStaticApr": BOOLEAN
    }

    */

    // -- Scheme Types
    let schemeTypes = [];

    switch (flattenForm['rate-type']) {
      case 'Fixed':
        schemeTypes.push("1");
        break;
      case 'Variable':
        schemeTypes.push("2");
        break;
      case 'All':
        schemeTypes = ["1", "2"];
        break;
    }
    const inputPayload = 
        {
          "input": {
             "PropertyValue": parseInt(flattenForm["property-value"]),
             "RepaymentValue": parseInt(flattenForm["borrow-amount"]),
             "PropertyType": "1",
             "MortgageType": flattenForm['purchase-habitable-purpose'] === 'live' ? 1 : 2, // Enum - INT - valid values - Residential (1) or Buy to Let (2)
             "InterestOnlyValue": "0",
             "TermYears":  parseInt(flattenForm["term-years"]),
             "SchemePurpose": flattenForm['purchase-type'] === 'Purchase' ? 1 : 2, // Enum - INT - valid values - Purchase (1) or Remortgage (2),
             "SchemePeriods": ["1", "2", "3", "4"],
             "SchemeTypes": schemeTypes,
             "NumberOfResults": "99",
             "Features": {
                "Erc": false,
                "Offset": false,
                "NewBuild": false
             },
             "SortColumn": "1",
             "UseStaticApr": false
          }
       }
  
    const result = await getProductsMCT(inputPayload);
    if (result) {
      console.log("MCT Products:", result);

      adjustor_syncForms(flattenForm);

      const noOfLenders = adjustor_groupLenders(result);
      const lowestRate = adjustor_rateSorter(result);
      const sortedResult = adjustor_resultSorter(result, 'Rate');

      // adjust Results
      const isEligable = (
        flattenForm['search-stage'] === 'offer-made' || 
        flattenForm['search-stage'] === 'offer-accepted'
      ) ? true : false;

      // Adjust the Single Result section
      flattenForm['ltv'] = result[0].LTV;
      flattenForm['number-of-lenders'] = noOfLenders;
      flattenForm['number-of-products'] = result.length;
      flattenForm['lowest-rate'] = lowestRate;
      flattenForm['we-have-found'] = `We have found ${result.length} products from ${noOfLenders} Lenders`;

      // Add Commas to Monetary values
      flattenForm['property-value'] = adjustor_formatNumberWithCommas(flattenForm['property-value']);
      flattenForm['borrow-amount'] = adjustor_formatNumberWithCommas(flattenForm['borrow-amount']);
      flattenForm['deposit-amount'] = adjustor_formatNumberWithCommas(flattenForm['deposit-amount']);

      adjustor_showHiddenFields();
      adjustor_hideLoaders('spinner-product');
      
      data_populateOutputValues(flattenForm);

      // Populate Results
      table_renderResults(sortedResult, isEligable);

      localStorage.setItem('product_results', sortedResult);
      localStorage.setItem('form_results', flattenForm);
      localStorage.setItem('is_eligable', isEligable);


    }else{
      table_noResults()
    }
  }
  