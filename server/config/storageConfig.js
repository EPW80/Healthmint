/**
 * Storage Configuration
 * Contains settings for file storage, IPFS integration, and HIPAA compliance requirements
 */

// Storage configuration with HIPAA-compliant defaults
export const STORAGE_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB default
  
  // Allowed file types - healthcare-specific formats included
  ALLOWED_MIME_TYPES: [
    // Images
    "image/jpeg",
    "image/png", 
    "image/gif",
    "image/dicom",  // Medical imaging
    
    // Documents
    "application/pdf",
    "application/json",
    "text/plain",
    "text/csv",
    "application/csv",
    
    // Office formats
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    
    // Healthcare specific
    "application/dicom",
    "application/hl7-v2",
    "application/fhir+json",
    "application/fhir+xml"
  ],
  
  // API endpoints
  ENDPOINTS: {
    UPLOAD: "api/storage/upload",
    DELETE: "api/storage/delete",
    DOWNLOAD: "api/storage/download",
    VERIFY: "api/storage/verify"
  },
  
  // Security settings
  ENCRYPT_FILES: true,
  ENCRYPTION_ALGORITHM: "AES-256-GCM",
  
  // HIPAA compliance settings
  RETENTION_PERIOD: 7 * 365, // 7 years default for HIPAA
  AUDIT_LOGGING: true,
  PHI_SCANNING_ENABLED: true,
  
  // IPFS configuration
  IPFS_PROVIDER: process.env.IPFS_PROVIDER || "web3storage",
  IPFS_GATEWAY: process.env.IPFS_GATEWAY || "https://dweb.link/ipfs/",
  IPFS_FALLBACK_GATEWAY: "https://gateway.pinata.cloud/ipfs/",
  
  // Performance settings
  CHUNK_SIZE: 10 * 1024 * 1024, // 10MB chunks for large file uploads
  CONCURRENT_UPLOADS: 3,
  
  // Backup settings
  ENABLE_REDUNDANCY: true,
  BACKUP_PROVIDERS: ["web3storage", "infura"]
};

// Export default configuration
export default {
  STORAGE_CONFIG
};