import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Web3Storage, getFilesFromPath } from 'web3.storage';

// Load env from the correct location
const envPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Using environment from parent directory');
  dotenv.config();
}

// Create a simple file document model for testing
const fileDocumentSchema = new mongoose.Schema({
  fileName: String,
  description: String,
  mimeType: String,
  fileSize: Number,
  cid: String,
  ipfsUrl: String,
  uploadDate: { type: Date, default: Date.now }
});

const FileDocument = mongoose.model('FileDocument', fileDocumentSchema);

// Modern function to make File objects
async function makeFileObjects() {
  const testFile = 'integration-test.txt';
  const content = `Test file for MongoDB+Web3Storage integration ${Date.now()}`;
  fs.writeFileSync(testFile, content);
  
  // Return file info and cleanup function
  return {
    path: testFile,
    content: content,
    size: content.length,
    cleanup: () => fs.unlinkSync(testFile)
  };
}

async function testIntegration() {
  try {
    console.log('Starting integration test...');
    
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // 2. Create Web3Storage client
    console.log('Initializing Web3Storage...');
    if (!process.env.WEB3_STORAGE_TOKEN) {
      throw new Error('WEB3_STORAGE_TOKEN is not defined in environment variables');
    }
    
    const storage = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
    console.log('✅ Web3Storage initialized');
    
    // 3. Create test file
    const { path: filePath, content, size, cleanup } = await makeFileObjects();
    
    // 4. Upload to Web3Storage using modern API
    console.log('Uploading to IPFS via Web3Storage...');
    
    // Read file contents
    const fileContent = fs.readFileSync(filePath);
    
    // Create File object
    const fileName = path.basename(filePath);
    const file = new File([fileContent], fileName, { type: 'text/plain' });
    
    // Use modern API to upload
    const cid = await storage.put([file], {
      name: fileName,
      maxRetries: 3,
      wrapWithDirectory: false,
    });
    
    console.log(`✅ File uploaded to IPFS with CID: ${cid}`);
    
    // 5. Save metadata to MongoDB
    console.log('Saving metadata to MongoDB...');
    const fileDoc = new FileDocument({
      fileName: fileName,
      description: 'Integration test file',
      mimeType: 'text/plain',
      fileSize: size,
      cid: cid,
      ipfsUrl: `https://w3s.link/ipfs/${cid}`  // Use w3s.link gateway
    });
    
    await fileDoc.save();
    console.log(`✅ Metadata saved to MongoDB with ID: ${fileDoc._id}`);
    
    // 6. Verify retrieval from MongoDB
    console.log('Verifying MongoDB record...');
    const savedDoc = await FileDocument.findOne({ cid });
    console.log('MongoDB record:', savedDoc);
    
    // 7. Clean up
    cleanup();
    console.log('✅ Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during integration test:', error);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

testIntegration();