import { API_BASE_URL } from "../constants/api.js";
export async function getLenderEvents() {
    try {
      const response = await fetch(API_BASE_URL+'/api/LendersHttpTrigger', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'API call failed'); 
      }
  
      return result;
    } catch (err) {
      console.error('Failed to get lender events:', err);
      return null;
    }
  }