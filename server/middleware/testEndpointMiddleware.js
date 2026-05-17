import { logger } from '../config/loggerConfig.js';

/**
 * Middleware that allows bypassing auth for test endpoints in development
 */
const testEndpointMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    // Create a test user for development purposes
    req.user = { 
      id: 'test-user',
      roles: ['admin'],
      role: 'admin',
      address: '0x0000000000000000000000000000000000000000'
    };
    
    console.log('Test endpoint accessed with auto-authentication:', {
      path: req.path, 
      testUser: req.user.id
    });
    
    next();
  } else {
    // Continue with normal auth flow
    next();
  }
};

export default testEndpointMiddleware;