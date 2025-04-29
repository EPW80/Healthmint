import express from 'express';
import multer from 'multer';
import secureStorageService from '../services/secureStorageService.js';
import testEndpointMiddleware from '../middleware/testEndpointMiddleware.js';

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

export default router;