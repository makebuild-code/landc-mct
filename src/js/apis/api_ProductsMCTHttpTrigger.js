import { API_BASE_URL } from "../constants/api.js";

export async function getProductsMCT(inputData) {
    try {
        console.log('INPUT PAYLOAD', inputData)
      const response = await fetch(API_BASE_URL+'/api/productsmcthttptrigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

  
      const result = await response.json();

      console.log('GET RESULT', result)
  
      if (!result.result.Products) {
        throw new Error(result.error || 'API call failed'); 
      }
  
      return result.result;
    } catch (err) {
      console.error('Failed to get mortgage products:', err);
      return null;
    }
  }