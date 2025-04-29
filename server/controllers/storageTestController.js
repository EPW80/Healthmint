import secureStorageService from '../services/secureStorageService.js';

// Test full storage flow: upload and retrieve
const testFullStorageFlow = async (req, res) => {
  try {
    // Test storage connection
    const connectionValid = await secureStorageService.validateIPFSConnection();
    
    if (!connectionValid) {
      return res.status(500).json({
        success: false,
        message: 'IPFS/Web3Storage connection failed',
        storageType: secureStorageService.storageType
      });
    }
    
    // Create a test file with unique content
    const timestamp = new Date().toISOString();
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const testContent = JSON.stringify({
      test: true,
      uniqueId,
      timestamp,
      message: "This is a test file for Web3Storage"
    }, null, 2);
    
    const testBuffer = Buffer.from(testContent);
    const testFile = {
      originalname: `test-file-${uniqueId}.json`,
      mimetype: 'application/json',
      buffer: testBuffer,
      size: testBuffer.length
    };
    
    // Upload the test file
    console.log(`Uploading test file: ${testFile.originalname}`);
    const uploadResult = await secureStorageService.uploadFile(testFile);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Upload test failed',
        error: uploadResult.error || 'Unknown error'
      });
    }
    
    // If using IPFS/Web3Storage, attempt to retrieve the file
    let retrieveResult = null;
    if (uploadResult.cid) {
      console.log(`Retrieving file with CID: ${uploadResult.cid}`);
      try {
        const fetchedData = await secureStorageService.fetchFromIPFS(uploadResult.cid);
        
        // Parse the data if it's a JSON object
        let parsedData;
        if (fetchedData instanceof ArrayBuffer) {
          const text = Buffer.from(fetchedData).toString('utf8');
          try {
            parsedData = JSON.parse(text);
          } catch (e) {
            parsedData = { rawText: text.substring(0, 100) + '...' };
          }
        } else {
          parsedData = fetchedData;
        }
        
        retrieveResult = {
          success: true,
          dataMatch: parsedData.uniqueId === uniqueId,
          parsedData
        };
      } catch (error) {
        retrieveResult = {
          success: false,
          error: error.message
        };
      }
    }
    
    return res.json({
      success: true,
      message: 'Storage test completed',
      storageType: secureStorageService.storageType,
      upload: uploadResult,
      retrieve: retrieveResult,
      testFile: {
        name: testFile.originalname,
        type: testFile.mimetype,
        size: testFile.size
      }
    });
  } catch (error) {
    console.error('Storage test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Storage test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export default {
  testIpfsFlow: testFullStorageFlow,
  testUpload: testFullStorageFlow
};