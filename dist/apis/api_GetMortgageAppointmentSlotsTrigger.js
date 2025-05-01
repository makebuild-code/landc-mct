export async function getMortAppointments() {
    try {
      const response = await fetch(API_BASE_URL+'/api/GetMortgageAppointmentSlotsTrigger', {
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