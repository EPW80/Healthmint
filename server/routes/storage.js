import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import storageIntegrationService from '../services/storageIntegrationService.js';
import hipaaCompliance from '../services/hipaaComplianceService.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Require authentication for most storage routes
router.use(verifyToken);

// Upload file endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file provided' 
      });
    }

    // Parse metadata
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.warn('Invalid metadata JSON:', e);
      }
    }
    
    // Add individual fields if provided directly
    if (req.body.description) metadata.description = req.body.description;
    if (req.body.category) metadata.category = req.body.category;
    if (req.body.price) metadata.price = req.body.price;
    if (req.body.isPublic) metadata.isPublic = req.body.isPublic === 'true';
    if (req.body.tags) {
      metadata.tags = req.body.tags.split(',').map(tag => tag.trim());
    }

    // Upload to Web3Storage and save metadata to MongoDB
    const result = await storageIntegrationService.uploadFile(
      req.file, 
      req.user.id, 
      metadata
    );

    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
});

// Get file metadata (or content with query param)
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const includeContent = req.query.content === 'true';
    const passphrase = req.query.passphrase;
    
    const file = await storageIntegrationService.getFile(id, req.user.id, { 
      includeContent,
      passphrase
    });
    
    res.json(file);
  } catch (error) {
    const status = 
      error.message.includes('not found') ? 404 : 
      error.message.includes('Access denied') ? 403 : 500;
      
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
});

// List user's files with filters and pagination
router.get('/files', async (req, res) => {
  try {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      search: req.query.search,
      includePublic: req.query.includePublic === 'true',
      sortField: req.query.sortField,
      sortDirection: req.query.sortDirection,
      onChain: req.query.onChain === 'true'
    };
    
    const files = await storageIntegrationService.listFiles(req.user.id, options);
    
    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve files'
    });
  }
});

// Update blockchain registration status
router.put('/files/:id/blockchain', async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionHash, blockNumber, smartContractAddress } = req.body;
    
    if (!transactionHash) {
      return res.status(400).json({
        success: false,
        message: 'Transaction hash is required'
      });
    }
    
    const updated = await storageIntegrationService.updateBlockchainStatus(
      id, 
      transactionHash, 
      { blockNumber, smartContractAddress }
    );
    
    res.json({
      success: true,
      file: updated
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update blockchain status'
    });
  }
});

// Delete file (soft delete)
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await storageIntegrationService.deleteFile(id, req.user.id);
    
    res.json(result);
  } catch (error) {
    const status = 
      error.message.includes('not found') ? 404 : 
      error.message.includes('Access denied') ? 403 : 500;
      
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete file'
    });
  }
});

// Update file metadata
router.put('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updated = await storageIntegrationService.updateFile(
      id, 
      req.user.id, 
      updates
    );
    
    res.json({
      success: true,
      file: updated
    });
  } catch (error) {
    const status = 
      error.message.includes('not found') ? 404 : 
      error.message.includes('Access denied') ? 403 : 500;
      
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update file'
    });
  }
});

// Share file with other users
router.post('/files/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { users } = req.body;
    
    if (!users || (Array.isArray(users) && users.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'No users specified for sharing'
      });
    }
    
    const updated = await storageIntegrationService.shareFile(
      id, 
      req.user.id, 
      users
    );
    
    res.json({
      success: true,
      file: updated
    });
  } catch (error) {
    const status = 
      error.message.includes('not found') ? 404 : 
      error.message.includes('Access denied') ? 403 : 500;
      
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to share file'
    });
  }
});

export default router;