// MongoDB Connection Test Script
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { join } from 'path';

// Configure dotenv to load from api/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'api', '.env') });

async function testConnection() {
    console.log('🔍 Testing MongoDB Connection...');
    
    // Get the MongoDB URI from environment
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI not found in environment variables');
        return;
    }
    
    // Check if password is still placeholder
    if (uri.includes('YOUR_PASSWORD') || uri.includes('YOUR_ACTUAL_PASSWORD_HERE')) {
        console.error('❌ MongoDB password is still a placeholder!');
        console.error('   Please update api/.env with your actual MongoDB password');
        return;
    }
    
    console.log('🔗 Connection String:', uri.substring(0, 50) + '...');
    
    try {
        // Attempt to connect
        await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Successfully connected to MongoDB!');
        console.log('📊 Database Status: Connected');
        
        // Test basic operations
        const db = mongoose.connection;
        console.log('📦 Database Name:', db.name);
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔒 Connection closed');
        
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:');
        console.error('   Error:', error.message);
        
        // Provide specific troubleshooting steps
        if (error.message.includes('authentication failed')) {
            console.error('   🔧 Fix: Check your MongoDB username and password');
        } else if (error.message.includes('Network')) {
            console.error('   🔧 Fix: Check your internet connection and MongoDB Atlas cluster status');
        } else if (error.message.includes('IP')) {
            console.error('   🔧 Fix: Add your IP address to MongoDB Atlas Network Access whitelist');
        }
    }
}

// Run the test
testConnection();