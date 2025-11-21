# Frontend-Backend Integration Setup

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies (if not done)
npm install

# Create .env file from example
cp env.example .env

# Edit .env and set your DATABASE_URL
# Example for local PostgreSQL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/robotops

# Run database migrations
npm run db:migrate

# Start the backend server
npm run dev
```

Backend will run on `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if not done)
npm install

# Start the frontend dev server
npm run dev
```

Frontend will run on `http://localhost:5173`

The Vite proxy is configured to forward `/api/*` requests to `http://localhost:8000`

## Configuration

### Backend (.env)

```env
NODE_ENV=development
PORT=8000

DATABASE_URL=postgresql://username:password@localhost:5432/database_name
JWT_SECRET=your-secret-key-here-change-in-production
JWT_ACCESS_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

```

### Frontend (.env or .env.local)

For local development, no configuration needed - the Vite proxy handles it.

For production, set:
```env
VITE_API_URL=https://your-backend-url.railway.app/api
```

## API Endpoints

All backend endpoints are prefixed with `/api`:

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`
- **Users**: `/api/auth/users`
- **Robots**: `/api/robots/*`
- **Groups**: `/api/groups/*`

## Troubleshooting

### Database Connection Error

If you see `EACCES` or connection errors:
1. Make sure PostgreSQL is running
2. Check your `DATABASE_URL` in `.env`
3. Ensure the database exists: `createdb robotops` (or your database name)
4. Run migrations: `npm run db:migrate`

2. Restart the backend server after changing `.env`

### API Request Failures

1. Check that backend is running on port 8000
2. Check browser console and network tab for error details
3. Verify the frontend is using the correct API base URL
4. Check backend logs for error messages

## Testing the Integration

1. Start both servers (backend and frontend)
2. Open `http://localhost:5173` in your browser
3. Try to register a new user
4. Login with the registered user
5. Navigate through the app to test all features

