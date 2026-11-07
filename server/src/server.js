import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Ensure server/.env is loaded reliably regardless of current working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocketServer } from './sockets/queue.socket.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas (asynchronous attempt with diagnostics)
connectDB();

// Create HTTP and WebSocket Server
const httpServer = http.createServer(app);
initSocketServer(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 QueueLess API & Real-Time Server running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ WebSocket / Socket.IO: Active`);
  console.log(`==================================================\n`);
});

// Graceful shutdown on termination signals
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
      }
    } catch (err) {
      console.error('Error closing MongoDB connection:', err.message);
    }
    console.log('Closed out remaining HTTP connections.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections without crashing the server process
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message || err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message || err);
  process.exit(1);
});
