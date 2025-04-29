import express from 'express';
import databaseTestController from '../controllers/databaseTestController.js';
import storageTestController from '../controllers/storageTestController.js';
import testEndpointMiddleware from '../middleware/testEndpointMiddleware.js';

const router = express.Router();

// Storage test endpoint
router.post('/storage', 
  testEndpointMiddleware,
  (req, res) => {
    try {
      return res.json({
        success: true,
        message: 'Storage test endpoint working',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// MongoDB test endpoint - choose ONE approach:
// Option 1: Using the controller (recommended if controller exists)
router.get('/mongodb', 
  testEndpointMiddleware,
  databaseTestController.testDatabaseConnection
);

export default router;