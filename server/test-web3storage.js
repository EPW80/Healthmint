import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Web3Storage } from 'web3.storage';

// Try multiple locations for the .env file
const envPaths = [
  './.env',                  // Current directory
  '../.env',                 // Parent directory
  '../../.env',              // Grandparent directory
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

async function testWeb3Storage() {
  try {
    console.log('Testing Web3Storage connection...');
    
    if (!process.env.WEB3_STORAGE_TOKEN) {
      console.error('❌ WEB3_STORAGE_TOKEN is not defined in environment variables');
      return;
    }
    
    // Create Web3Storage client
    const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
    console.log('✅ Web3Storage client initialized');
    
    // Create a test file
    const filePath = './web3-test-file.txt';
    const content = `Test file created at ${new Date().toISOString()}`;
    fs.writeFileSync(filePath, content);
    console.log(`Created test file: ${filePath}`);
    
    // Prepare file for upload
    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], 'web3-test-file.txt', { type: 'text/plain' });
    
    // Upload file
    console.log('Uploading file to Web3Storage...');
    const cid = await client.put([file], { wrapWithDirectory: false });
    
    console.log('✅ File uploaded successfully!');
    console.log(`CID: ${cid}`);
    console.log(`Gateway URL: https://dweb.link/ipfs/${cid}`);
    
    // Clean up
    fs.unlinkSync(filePath);
    console.log('Test file deleted');
    
  } catch (error) {
    console.error('❌ Web3Storage error:', error);
  }
}

testWeb3Storage();