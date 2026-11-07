import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js';
import serviceRoutes from './routes/service.routes.js';
import staffRoutes from './routes/staff.routes.js';
import workingHoursRoutes from './routes/workingHours.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import queueRoutes from './routes/queue.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Configure Express Trusted Proxy safely
// Reads TRUST_PROXY env (e.g. '1', 'true', 'loopback') or defaults to 1 hop in production
if (process.env.TRUST_PROXY !== undefined) {
  const tp = process.env.TRUST_PROXY.trim();
  if (tp === 'true') app.set('trust proxy', true);
  else if (tp === 'false') app.set('trust proxy', false);
  else if (!isNaN(Number(tp))) app.set('trust proxy', Number(tp));
  else app.set('trust proxy', tp);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing (CORS) with credentials enabled
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true, // Crucial for HTTP-only cookie exchange
  })
);

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Cookie parser middleware (extracts cookies into req.cookies)
app.use(cookieParser());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection (strips $ and . from user inputs)
app.use(
  mongoSanitize({
    replaceWith: '_',
  })
);

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'QueueLess API',
    tagline: 'Skip the Wait. Own Your Time.',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/working-hours', workingHoursRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
