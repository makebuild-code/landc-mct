import { API_BASE_URL } from "../constants/api.js";
export async function getLogEvents(inputData) {
    try {
      const response = await fetch(API_BASE_URL+'/api/LogEventHttpTrigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'API call failed'); 
      }
  
      return result;
    } catch (err) {
      console.error('Failed to get log events:', err);
      return null;
    }
  }