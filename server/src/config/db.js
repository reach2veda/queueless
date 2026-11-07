import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Determine absolute directory path to guarantee server/.env is always loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, '../../.env');

// Explicitly load server/.env regardless of current working directory
dotenv.config({ path: serverEnvPath });

let lastDbError = null;

/**
 * Mask sensitive credentials from connection strings in logs
 */
const sanitizeMongoUri = (message = '') => {
  return message.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
};

/**
 * Connect to MongoDB Atlas
 * Uses Mongoose ODM to establish connection to the 'queueless' database.
 */
export const connectDB = async () => {
  // Always fetch fresh environment variable
  let rawUri = process.env.MONGODB_URI;

  // Sanitize whitespace, enclosing single/double quotes
  if (typeof rawUri === 'string') {
    rawUri = rawUri.trim().replace(/^["']|["']$/g, '');
  }

  // Check 1: Undefined or empty string
  if (!rawUri || rawUri === '') {
    lastDbError = 'MONGODB_URI is undefined or empty in server/.env';
    console.warn(`\n⚠️  [Database Warning]: ${lastDbError}`);
    console.warn(`ℹ️   Checking path: ${serverEnvPath}`);
    console.warn('ℹ️   Please verify server/.env contains: MONGODB_URI=mongodb+srv://...\n');
    return false;
  }

  // Check 2: Verify scheme starts with mongodb:// or mongodb+srv://
  if (!rawUri.startsWith('mongodb://') && !rawUri.startsWith('mongodb+srv://')) {
    lastDbError = `Invalid scheme: URI must start with "mongodb://" or "mongodb+srv://". Current prefix is "${rawUri.substring(0, 15)}..."`;
    console.error(`\n❌ [Database Scheme Error]: ${lastDbError}`);
    console.error('👉 Please check server/.env line 11. Ensure there are no typos or duplicated variable names.');
    return false;
  }

  try {
    const conn = await mongoose.connect(rawUri, {
      dbName: 'queueless', // Explicitly enforce the 'queueless' database name
      serverSelectionTimeoutMS: 5000, // 5s timeout if cluster is unreachable
    });

    lastDbError = null;

    // Safe success message (Never logs passwords or full connection string)
    console.log(`\n==================================================`);
    console.log(`✅ [MongoDB Connected]: MongoDB Atlas`);
    console.log(`🗄️  Database Name : ${conn.connection.name}`);
    console.log(`🌐 Cluster Host   : ${conn.connection.host}`);
    console.log(`⚡ Ready State    : Connected (Code ${conn.connection.readyState})`);
    console.log(`==================================================\n`);

    // Monitor ongoing connection events
    mongoose.connection.on('error', (err) => {
      lastDbError = sanitizeMongoUri(err.message);
      console.error(`❌ [MongoDB Runtime Error]:`, lastDbError);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`⚠️  [MongoDB Warning]: Lost connection to MongoDB Atlas. Retrying...`);
    });

    mongoose.connection.on('reconnected', () => {
      lastDbError = null;
      console.log(`🔄 [MongoDB Reconnected]: Successfully restored connection to Atlas.`);
    });

    return true;
  } catch (error) {
    lastDbError = sanitizeMongoUri(error.message);
    console.error(`\n❌ [MongoDB Connection Error]: ${lastDbError}`);
    console.error('👉 Diagnostic Checklist:');
    if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
      console.error('   • The cluster hostname could not be found via DNS.');
      console.error('   • Verify the cluster subdomain in server/.env matches your Atlas Dashboard.');
    } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('   • Authentication failed: check username and password in server/.env.');
      console.error('   • If password has special characters, ensure they are URL-encoded.');
    } else {
      console.error('   • Ensure your IP address is whitelisted in MongoDB Atlas under Network Access.');
      console.error('   • Confirm Cluster0 is active and running in Atlas.');
    }
    console.error('');
    return false;
  }
};

/**
 * Returns a human-readable database connection state
 */
export const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateCode = mongoose.connection.readyState;

  return {
    stateCode,
    status: states[stateCode] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    lastError: lastDbError,
  };
};
