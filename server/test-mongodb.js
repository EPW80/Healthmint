import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Try multiple locations for the .env file
const envPaths = [
  './.env',                  // Current directory
  '../.env',                 // Parent directory
  '../../.env',              // Grandparent directory
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env')
];

let envLoaded = false;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('❌ No .env file found in any of the expected locations.');
  console.log('Checked locations:', envPaths);
}

// Log all environment variables (except sensitive ones)
console.log('\n--- Environment Variables ---');
Object.keys(process.env).forEach(key => {
  if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN')) {
    console.log(`${key}: [HIDDEN]`);
  } else {
    console.log(`${key}: ${process.env[key]}`);
  }
});

async function testConnection() {
  try {
    console.log('\n--- MongoDB Connection Test ---');
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.log('Let\'s create one manually for testing:');
      
      // Use a default MongoDB URI for testing
      process.env.MONGODB_URI = 'mongodb://localhost:27017/healthmint';
      console.log('Using default URI:', process.env.MONGODB_URI);
    } else {
      // Safe display of the URI (hide credentials)
      let safeUri = process.env.MONGODB_URI;
      if (safeUri.includes('@')) {
        safeUri = safeUri.replace(/\/\/([^:]+):([^@]+)@/, '//\$1:****@');
      }
      console.log('Using MONGODB_URI:', safeUri);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    // Try a simple operation
    const collections = await mongoose.connection.db.collections();
    console.log(`Collections in database: ${collections.map(c => c.collectionName).join(', ') || 'No collections found'}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected successfully');
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.log('This usually means MongoDB is not running or the connection string is incorrect.');
    }
  }
}

testConnection();