import express from 'express';
import multer from 'multer';
import secureStorageService from '../services/secureStorageService.js';
import testEndpointMiddleware from '../middleware/testEndpointMiddleware.js';
import FileDocument from '../models/FileDocument.js';
import mongoose from 'mongoose';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Test file upload endpoint that bypasses authentication
router.post('/file-upload', 
  testEndpointMiddleware,  // This will set a test user
  upload.single('file'),   // Process file upload
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      console.log('Test upload received file:', req.file.originalname);
      
      // Use the secure storage service to upload
      const result = await secureStorageService.uploadFile(req.file);
      
      return res.json({
        success: true,
        message: 'File uploaded successfully',
        fileDetails: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        storageResult: result
      });
    } catch (error) {
      console.error('Test upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: error.message
      });
    }
  }
);

// Update your file-upload endpoint to use FileDocument
router.post('/file-upload-with-metadata', 
  testEndpointMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      console.log('Test upload received file:', req.file.originalname);
      
      // Use the secure storage service to upload
      const result = await secureStorageService.uploadFile(req.file);
      
      // Generate a test user ID if one doesn't exist
      const testUserId = new mongoose.Types.ObjectId();
      
      // Create a new FileDocument
      const fileDoc = new FileDocument({
        // File metadata
        fileName: req.file.originalname,
        description: req.body.description || 'Uploaded via test endpoint',
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        extension: req.file.originalname.split('.').pop(),
        
        // IPFS storage details
        cid: result.cid,
        ipfsUrl: result.url,
        storageMethod: 'ipfs',
        
        // Owner (required field)
        owner: testUserId,
        
        // Classification
        category: req.body.category || 'General Health',
        tags: req.body.tags ? req.body.tags.split(',') : ['test'],
        
        // HIPAA and PHI
        containsPHI: req.body.containsPHI === 'true',
        sensitivity: req.body.sensitivity || 'medium',
        
        // Access control
        isPublic: req.body.isPublic === 'true' || false,
        
        // Verification
        checksum: {
          algorithm: 'sha256',
          value: result.checksum || ''
        }
      });
      
      // Save the document
      const savedDoc = await fileDoc.save();
      
      return res.json({
        success: true,
        message: 'File uploaded and metadata saved',
        fileDetails: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        storageResult: result,
        fileDocument: savedDoc
      });
    } catch (error) {
      console.error('Test upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: error.message
      });
    }
  }
);

// Add a route to get all file documents
router.get('/files', testEndpointMiddleware, async (req, res) => {
  try {
    const files = await FileDocument.find({ isDeleted: false }).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('Error retrieving files:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve files',
      error: error.message
    });
  }
});

export default router;