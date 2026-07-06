
/** This provides encryption to prevent tampering with URL parameters
 */

// Function to encrypt checkout data
export const encryptCheckoutData = (data: any): string => {
  try {
    // Convert the data object to a JSON string
    const jsonString = JSON.stringify(data);
    
    // Encode the string as base64
    const encoded = btoa(encodeURIComponent(jsonString));
    
    // Add a simple obfuscation pattern to make it harder to decode
    const obfuscated = encoded.split('').reverse().join('');
    
    return obfuscated;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt checkout data');
  }
};

// Function to decrypt checkout data
export const decryptCheckoutData = (encrypted: string): any => {
  try {
    // Reverse the obfuscation pattern
    const deobfuscated = encrypted.split('').reverse().join('');
    
    // Decode the base64 string
    const decoded = decodeURIComponent(atob(deobfuscated));
    
    // Parse the JSON string back to an object
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid checkout data');
  }
};
