import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import robotRoutes from './routes/robot.routes.js';
import groupRoutes from './routes/group.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware - CORS Configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

console.log('CORS Origins configured:', corsOrigins);

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.path.startsWith('/api')) {
    console.log(`[${req.method}] ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    console.log(`CORS check - Origin: ${origin || 'none'}`);
    
    // Allow requests with no origin (mobile apps, curl, Postman, proxy requests, etc.)
    if (!origin) {
      console.log('Allowing request with no origin');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (corsOrigins.includes(origin)) {
      console.log(`Origin ${origin} is in allowed list`);
      callback(null, true);
      return;
    }
    
    // In development, allow all localhost variants
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        console.log(`Allowing localhost origin in development: ${origin}`);
        callback(null, true);
        return;
      }
    }
    
    // Log blocked origin for debugging
    console.warn(`CORS blocked origin: ${origin}`);
    console.warn(`Allowed origins: ${corsOrigins.join(', ')}`);
    // In development, log but allow (for easier debugging)
    // In production, this should reject
    if (process.env.NODE_ENV === 'production') {
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    } else {
      console.log('Development mode: allowing origin despite not being in list');
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle trailing slashes - remove them for consistency
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.split('?')[1] || '';
    req.url = req.path.slice(0, -1) + (query ? '?' + query : '');
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/robots', robotRoutes);
app.use('/api/groups', groupRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: 'Not found' });
});

// Test database connection on startup
async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      const { query } = await import('./lib/db.js');
      await query('SELECT NOW()');
      console.log('✅ Database connection successful');
    } else {
      console.warn('⚠️  No DATABASE_URL set - database operations will fail');
    }
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('⚠️  Server will start but API calls will fail');
    console.error('⚠️  Please check your DATABASE_URL and ensure PostgreSQL is running');
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 CORS configured for origins: ${corsOrigins.join(', ')}`);
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log('🔧 Development mode: Allowing all localhost origins');
    }
    console.log(`📝 Health check: http://localhost:${PORT}/health\n`);
  });
}

startServer().catch(console.error);

export default app;

