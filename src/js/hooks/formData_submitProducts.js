import { getProductsMCT } from "../apis/api_ProductsMCTHttpTrigger";

export async function submitProducts(e) {
    e.preventDefault(); // Prevent default form submit
  
    const form = e.target;
    const formData = new FormData(form);
  
    const inputPayload = {
      PropertyValue: '280000',//parseInt(formData.get("property-value") as string),
      RepaymentValue: '250000',//parseInt(formData.get("repayment-value") as string),
      PropertyType: '',//parseInt(formData.get("property-type") as string),
      MortgageType: 'R',//parseInt(formData.get("mortgage-type") as string),
      InterestOnlyValue: '0',//parseInt((formData.get("interest-only") as string) || "0"),
      TermYears: '25',//parseInt(formData.get("term-years") as string),
      SchemePurpose: '',//parseInt(formData.get("scheme-purpose") as string),
      SchemePeriods: ["1", "2", "3"],
      SchemeTypes: ["1"],
      NumberOfResults: 1,
      Features: {
        HelpToBuy: false,
        Offset: false,
        EarlyRepaymentCharge: false,
        NewBuild: false,
      },
      SortColumn: 1,
      UseStaticApr: false,
      SapValue: 50,
      Lenders: "",
      IncludeRetention: false,
      RetentionLenderId: "",
    };
  
    const result = await getProductsMCT(inputPayload);
    if (result) {
      console.log("MCT Products:", result.Products);
      // Render in Webflow or call another hook
    }
  }
  