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

// CORS - Allow all origins
app.use(cors({
  origin: (origin, callback) => {
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200,
}));

app.options('*', cors());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${req.method}] ${req.path}`);
  }
  next();
});

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
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health\n`);
  });
}

startServer().catch(console.error);

export default app;

