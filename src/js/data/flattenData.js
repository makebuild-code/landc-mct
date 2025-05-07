export function flattenData(nestedFormData) {
    const flat = {};
  
    Object.entries(nestedFormData).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([innerKey, innerValue]) => {
          flat[innerKey] = innerValue;
        });
      } else {
        flat[key] = value;
      }
    });
  
    return flat;
  }