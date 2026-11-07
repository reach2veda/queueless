import mongoose from 'mongoose';
import { getDatabaseStatus } from '../config/db.js';

/**
 * Health check controller
 * Endpoint: GET /api/health
 * Returns service status, uptime, and database connectivity.
 */
export const checkHealth = async (req, res) => {
  const dbStatus = getDatabaseStatus();
  let dbPingMs = null;

  // If connected, perform an active database ping to verify live latency
  if (dbStatus.stateCode === 1 && mongoose.connection.db) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - start;
    } catch (err) {
      dbPingMs = -1;
    }
  }

  const isHealthy = dbStatus.stateCode === 1 && dbPingMs !== -1;

  const healthData = {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'QueueLess API',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.status,
      readyState: dbStatus.stateCode,
      databaseName: dbStatus.name || 'queueless',
      host: dbStatus.host,
      pingMs: dbPingMs,
      error: dbStatus.lastError || null,
    },
    message: isHealthy
      ? 'All systems operational: Connected to MongoDB Atlas (queueless)'
      : dbStatus.lastError
      ? `Database notice: ${dbStatus.lastError}`
      : 'API is running, but database connection is pending. Check server/.env MONGODB_URI.',
  };

  return res.status(200).json(healthData);
};
