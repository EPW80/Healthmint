import mongoose from 'mongoose';

const testDatabaseConnection = async (req, res) => {
  try {
    console.log('MongoDB test endpoint called');
    
    // Check connection status
    const connectionState = mongoose.connection.readyState;
    const connectionStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    }[connectionState] || 'unknown';
    
    console.log(`Connection state: ${connectionStatus} (${connectionState})`);

    if (connectionState !== 1) {
      return res.status(500).json({
        success: false,
        message: `MongoDB not connected (state: ${connectionStatus})`,
        connectionState
      });
    }

    // Get collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    return res.json({
      success: true,
      message: 'MongoDB connection verified',
      connectionDetails: {
        state: connectionStatus,
        database: mongoose.connection.name || 'unknown',
        host: mongoose.connection.host,
        port: mongoose.connection.port
      },
      collections: collectionNames
    });
  } catch (error) {
    console.error('MongoDB test error:', error);
    return res.status(500).json({
      success: false,
      message: 'MongoDB test failed',
      error: error.message
    });
  }
};

export default {
  testDatabaseConnection
};