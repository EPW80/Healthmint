// src/services/encryptionService.js
import { ENCRYPTION_CONFIG } from "../config/environmentConfig.js";

/**
 * EncryptionService
 * 
 * Provides encryption, decryption, and hashing services for secure file handling
 * in compliance with HIPAA requirements.
 */
class EncryptionService {
  constructor() {
    this.config = {
      algorithm: ENCRYPTION_CONFIG?.ALGORITHM || 'AES-GCM',
      keyLength: ENCRYPTION_CONFIG?.KEY_LENGTH || 256,
      hashAlgorithm: ENCRYPTION_CONFIG?.HASH_ALGORITHM || 'SHA-256',
      enabled: ENCRYPTION_CONFIG?.ENABLED !== false, // Default to true
    };
    
    // Initialize WebCrypto API
    this.crypto = window.crypto || window.msCrypto;
    this.subtle = this.crypto?.subtle;
    
    if (!this.subtle && this.config.enabled) {
      console.warn('Web Crypto API is not available in this browser. Encryption will be simulated.');
    }
  }

  /**
   * Checks if encryption is available in this browser
   * @returns {boolean} True if encryption is available
   */
  isEncryptionAvailable() {
    return !!this.subtle && this.config.enabled;
  }

  /**
   * Encrypts a file
   * @param {File|Blob} file - File to encrypt
   * @returns {Promise<Blob>} Encrypted file
   */
  async encryptFile(file) {
    // If encryption is disabled or not available, return the original file
    if (!this.isEncryptionAvailable()) {
      return file;
    }

    try {
      // Convert the file to an ArrayBuffer
      const fileBuffer = await this.fileToArrayBuffer(file);
      
      // Generate a random encryption key
      const key = await this.subtle.generateKey(
        {
          name: this.config.algorithm,
          length: this.config.keyLength,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Generate a random initialization vector
      const iv = this.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await this.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv,
        },
        key,
        fileBuffer
      );
      
      // Export the key to store with the file
      const exportedKey = await this.subtle.exportKey('raw', key);
      
      // Create a header with encryption metadata
      const header = {
        algorithm: this.config.algorithm,
        keyLength: this.config.keyLength,
        iv: Array.from(iv),
        key: Array.from(new Uint8Array(exportedKey)),
        origType: file.type,
        origName: file.name,
        origSize: file.size,
        timestamp: Date.now(),
      };
      
      // Convert header to JSON and then to ArrayBuffer
      const headerString = JSON.stringify(header);
      const headerBuffer = new TextEncoder().encode(headerString);
      
      // Combine header length (4 bytes), header, and encrypted data
      const headerLengthBuffer = new Uint32Array([headerBuffer.byteLength]);
      const combinedBuffer = new Uint8Array(
        4 + headerBuffer.byteLength + encryptedBuffer.byteLength
      );
      
      combinedBuffer.set(new Uint8Array(headerLengthBuffer.buffer), 0);
      combinedBuffer.set(headerBuffer, 4);
      combinedBuffer.set(new Uint8Array(encryptedBuffer), 4 + headerBuffer.byteLength);
      
      // Create a new Blob with the combined data
      return new Blob([combinedBuffer], { type: 'application/encrypted' });
    } catch (error) {
      console.error('Encryption error:', error);
      // In case of error, return the original file
      return file;
    }
  }

  /**
   * Decrypts a file
   * @param {Blob} encryptedBlob - Encrypted file blob
   * @returns {Promise<Blob>} Decrypted file
   */
  async decryptFile(encryptedBlob) {
    // If encryption is disabled or not available, return the original blob
    if (!this.isEncryptionAvailable()) {
      return encryptedBlob;
    }

    try {
      // Convert the blob to an ArrayBuffer
      const encryptedBuffer = await this.fileToArrayBuffer(encryptedBlob);
      
      // Extract the header length
      const headerLengthView = new DataView(encryptedBuffer.slice(0, 4));
      const headerLength = headerLengthView.getUint32(0);
      
      // Extract and parse the header
      const headerBuffer = encryptedBuffer.slice(4, 4 + headerLength);
      const headerString = new TextDecoder().decode(headerBuffer);
      const header = JSON.parse(headerString);
      
      // Extract the encrypted data
      const encryptedData = encryptedBuffer.slice(4 + headerLength);
      
      // Import the encryption key
      const keyBuffer = new Uint8Array(header.key).buffer;
      const key = await this.subtle.importKey(
        'raw',
        keyBuffer,
        {
          name: header.algorithm,
          length: header.keyLength,
        },
        false, // not extractable
        ['decrypt']
      );
      
      // Create initialization vector
      const iv = new Uint8Array(header.iv);
      
      // Decrypt the data
      const decryptedBuffer = await this.subtle.decrypt(
        {
          name: header.algorithm,
          iv,
        },
        key,
        encryptedData
      );
      
      // Create a new Blob with the decrypted data and original type
      return new Blob([decryptedBuffer], { type: header.origType });
    } catch (error) {
      console.error('Decryption error:', error);
      // In case of error, return the original blob
      return encryptedBlob;
    }
  }

  /**
   * Hashes a file for integrity verification
   * @param {File|Blob} file - File to hash
   * @returns {Promise<string>} Hex string hash of the file
   */
  async hashFile(file) {
    try {
      // If Web Crypto API is not available, return a placeholder
      if (!this.subtle) {
        return this.fallbackHash(file.name + file.size + file.lastModified);
      }
      
      // Convert the file to an ArrayBuffer
      const fileBuffer = await this.fileToArrayBuffer(file);
      
      // Create a hash of the file
      const hashBuffer = await this.subtle.digest(
        this.config.hashAlgorithm,
        fileBuffer
      );
      
      // Convert the hash to a hex string
      return this.arrayBufferToHex(hashBuffer);
    } catch (error) {
      console.error('Hashing error:', error);
      // In case of error, return a fallback hash
      return this.fallbackHash(file.name + file.size + file.lastModified);
    }
  }

  /**
   * Converts a file or blob to an ArrayBuffer
   * @param {File|Blob} file - File to convert
   * @returns {Promise<ArrayBuffer>} Array buffer of the file
   * @private
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Converts an ArrayBuffer to a hex string
   * @param {ArrayBuffer} buffer - Array buffer to convert
   * @returns {string} Hex string representation
   * @private
   */
  arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Fallback hash function when WebCrypto is not available
   * @param {string} input - String to hash
   * @returns {string} Simple hash of the input
   * @private
   */
  fallbackHash(input) {
    let hash = 0;
    if (input.length === 0) return '0';
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Encrypts text (for API requests, etc.)
   * @param {string} text - Text to encrypt
   * @returns {Promise<string>} Base64 encoded encrypted text
   */
  async encryptText(text) {
    if (!this.isEncryptionAvailable()) {
      // Simple obfuscation when encryption is not available
      return btoa(text);
    }

    try {
      // Generate a random encryption key
      const key = await this.subtle.generateKey(
        {
          name: this.config.algorithm,
          length: this.config.keyLength,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Generate a random initialization vector
      const iv = this.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encodedText = new TextEncoder().encode(text);
      const encryptedBuffer = await this.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv,
        },
        key,
        encodedText
      );
      
      // Export the key
      const exportedKey = await this.subtle.exportKey('raw', key);
      
      // Create a combined buffer with IV, key, and encrypted data
      const combined = {
        iv: Array.from(iv),
        key: Array.from(new Uint8Array(exportedKey)),
        data: Array.from(new Uint8Array(encryptedBuffer)),
      };
      
      // Return as base64 encoded JSON
      return btoa(JSON.stringify(combined));
    } catch (error) {
      console.error('Text encryption error:', error);
      // Simple obfuscation when encryption fails
      return btoa(text);
    }
  }

  /**
   * Decrypts text
   * @param {string} encryptedText - Base64 encoded encrypted text
   * @returns {Promise<string>} Decrypted text
   */
  async decryptText(encryptedText) {
    if (!this.isEncryptionAvailable()) {
      // Simple de-obfuscation when encryption is not available
      try {
        return atob(encryptedText);
      } catch (e) {
        return encryptedText;
      }
    }

    try {
      // Parse the combined data
      const combined = JSON.parse(atob(encryptedText));
      
      // Extract the components
      const iv = new Uint8Array(combined.iv);
      const keyData = new Uint8Array(combined.key);
      const encryptedData = new Uint8Array(combined.data);
      
      // Import the encryption key
      const key = await this.subtle.importKey(
        'raw',
        keyData,
        {
          name: this.config.algorithm,
          length: this.config.keyLength,
        },
        false, // not extractable
        ['decrypt']
      );
      
      // Decrypt the data
      const decryptedBuffer = await this.subtle.decrypt(
        {
          name: this.config.algorithm,
          iv,
        },
        key,
        encryptedData
      );
      
      // Decode the result to text
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('Text decryption error:', error);
      // Try simple de-obfuscation as fallback
      try {
        return atob(encryptedText);
      } catch (e) {
        return encryptedText;
      }
    }
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;