/**
 * FormChippy Data Persistence Module
 * Handles saving and retrieving form data from localStorage
 */

export class Persistence {
    /**
     * Initialize the persistence module
     * @param {Object} formChippy - The FormChippy instance
     */
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.storageKeyPrefix = 'formchippy_data_';
        // No longer need separate expiry keys as we'll include expiry in the data object
        this.defaultExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    }

    /**
     * Generate a storage key for a form
     * @param {string} formName - The form name
     * @returns {string} The storage key
     */
    getStorageKey(formName) {
        // Make sure we always have a valid form name, falling back to FormChippy instance name if available
        const validFormName = formName || this.formChippy.name || 'default';
        return this.storageKeyPrefix + validFormName;
    }

    getLCIDKey(formName) {
        // Make sure we always have a valid form name, falling back to FormChippy instance name if available
        const validFormName = formName || this.formChippy.name || 'default';
        return this.storageKeyPrefix + validFormName;
    }

    /**
     * Save form data to localStorage
     * @param {string} formName - The form name
     * @param {Object} formData - The form data to save
     * @param {number} expiryMs - Optional: custom expiry time in milliseconds
     */
    saveFormData(formName, formData, expiryMs) {
        try {
            // Make sure we have a valid form name
            if (!formName && this.formChippy.name) {
                formName = this.formChippy.name;
                this.formChippy.debug?.info(`Using form name from FormChippy instance: ${formName}`);
            }
            
            // Force formName to be defined - this is required
            if (!formName) {
                formName = this.formChippy.formName || this.formChippy.name || 'default';
                this.formChippy.debug?.info(`Using fallback form name: ${formName}`);
            }

            // Calculate expiration time
            const expires = Date.now() + (expiryMs || this.defaultExpiry);
            
            // Enhanced data structure that includes form name, timestamp, and expiry
            const enhancedData = {
                formName: formName, // The form name from data-fc-container
                timestamp: Date.now(), // When the data was saved
                expires: expires, // When the data expires (replaces separate expiry entry)
                data: formData // The actual form data
            };
            
            // Log the complete object being saved
            this.formChippy.debug?.info(`Saving enhanced data structure:`, enhancedData);
            
            // Store everything in a single localStorage entry
            const key = this.getStorageKey(formName);
            localStorage.setItem(key, JSON.stringify(enhancedData));
            
            // Trigger a data update event that other components can listen for
            if (typeof document !== 'undefined') {
                const event = new CustomEvent('formchippy:dataUpdate', {
                    detail: {
                        formName: formName,
                        key: key,
                        source: 'persistence'
                    },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
            
            this.formChippy.debug?.info(`Form data saved to localStorage: ${key}`);
            return true;
        } catch (error) {
            this.formChippy.debug?.error('Error saving form data to localStorage:', error);
            return false;
        }
    }

    /**
     * Load form data from localStorage
     * @param {string} formName - The form name
     * @param {boolean} [rawFormat=false] - Whether to return the raw enhanced data structure or just the form data
     * @returns {Object|null} The retrieved form data or null if not found/expired
     */
    loadFormData(formName, rawFormat = false) {
        try {
            
            const key = this.getStorageKey(formName);
            console.log('getformNameKey:', key);
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i); // Get the key by index
                const value = localStorage.getItem(key); // Get the value
                console.log(`Key: ${key}`, value);
              }
            
            // Check if data exists
            const storedData = localStorage.getItem(key);
            if (!storedData) {
                this.formChippy.debug?.info(`No form data found in localStorage for: ${key}`);
                return null;
            }
            
            // Parse the stored data
            const parsedData = JSON.parse(storedData);
            
            // Check if the data has an expiry field (new format)
            if (parsedData.expires && Date.now() > parsedData.expires) {
                this.formChippy.debug?.info(`Form data expired for: ${key}`);
                this.clearFormData(formName); // Clean up expired data
                return null;
            }
            
            // Support for old format with separate expiry key
            if (!parsedData.expires) {
                const oldExpiryKey = `formchippy_expires_${formName}`;
                const expiryTimestamp = parseInt(localStorage.getItem(oldExpiryKey) || '0', 10);
                if (expiryTimestamp && Date.now() > expiryTimestamp) {
                    this.formChippy.debug?.info(`Form data expired for: ${key} (old format)`);
                    this.clearFormData(formName); // Clean up expired data
                    return null;
                }
            }
            
            // Check if it's already in the enhanced format
            const isEnhancedFormat = parsedData && parsedData.hasOwnProperty('formName') && 
                                      parsedData.hasOwnProperty('data');
            
            // If it's in the old format, convert it to the enhanced format
            const formData = isEnhancedFormat ? parsedData : {
                formName: formName,
                timestamp: Date.now(),
                expires: Date.now() + this.defaultExpiry, // Add expiry for old format
                data: parsedData
            };
            
            this.formChippy.debug?.info(`Form data loaded from localStorage: ${key}`, formData);
            
            // Return either the enhanced structure or just the form data
            return rawFormat ? formData : (isEnhancedFormat ? formData.data : parsedData);
        } catch (error) {
            this.formChippy.debug?.error('Error loading form data from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Clear form data from localStorage
     * @param {string} formName - The form name (or null to clear all)
     */
    clearFormData(formName) {
        try {
            if (formName) {
                // Clear specific form data - now only need to remove the single key
                const key = this.getStorageKey(formName);
                localStorage.removeItem(key);
                
                // For backward compatibility, also check for old format expiry key
                const oldExpiryKey = `formchippy_expires_${formName}`;
                if (localStorage.getItem(oldExpiryKey)) {
                    localStorage.removeItem(oldExpiryKey);
                }
                
                this.formChippy.debug?.info(`Cleared form data for: ${key}`);
            } else {
                // Clear all FormChippy data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('formchippy_')) {
                        keysToRemove.push(key);
                    }
                }
                
                // Remove all matching keys
                keysToRemove.forEach(key => localStorage.removeItem(key));
                this.formChippy.debug?.info(`Cleared all FormChippy data (${keysToRemove.length} items)`);
            }
            return true;
        } catch (error) {
            this.formChippy.debug?.error('Error clearing form data from localStorage:', error);
            return false;
        }
    }
    
    /**
     * Check if form data exists in localStorage
     * @param {string} formName - The form name
     * @returns {boolean} True if form data exists and is not expired
     */
    hasFormData(formName) {
        const key = this.getStorageKey(formName);
        
        // Check if data exists
        const storedData = localStorage.getItem(key);
        if (!storedData) return false;
        
        try {
            // Parse the stored data to check expiry
            const parsedData = JSON.parse(storedData);
            
            // Check if using new format with embedded expiry
            if (parsedData.expires && Date.now() > parsedData.expires) {
                this.clearFormData(formName); // Clean up expired data
                return false;
            }
            
            // Support for old format with separate expiry key
            if (!parsedData.expires) {
                const oldExpiryKey = `formchippy_expires_${formName}`;
                const expiryTimestamp = parseInt(localStorage.getItem(oldExpiryKey) || '0', 10);
                if (expiryTimestamp && Date.now() > expiryTimestamp) {
                    this.clearFormData(formName); // Clean up expired data
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            this.formChippy.debug?.error('Error checking form data expiry:', error);
            return false;
        }
    }
    
    /**
     * Get all saved form data
     * @param {boolean} [rawFormat=false] - Whether to return the raw enhanced data structure or just the form data
     * @returns {Object} Object with formName as keys and formData as values
     */
    getAllForms(rawFormat = false) {
        const forms = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storageKeyPrefix)) {
                    const formName = key.replace(this.storageKeyPrefix, '');
                    // Only include non-expired data
                    if (this.hasFormData(formName)) {
                        forms[formName] = this.loadFormData(formName, rawFormat);
                    }
                }
            }
        } catch (error) {
            this.formChippy.debug?.error('Error retrieving all forms:', error);
        }
        return forms;
    }
}
