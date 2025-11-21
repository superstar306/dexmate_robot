# Starting the Backend Server

## Issue: Connection Refused

If you're getting "connection refused" errors from the frontend, the backend server is not running.

## Quick Start

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Check your DATABASE_URL:**
   ```bash
   # Windows PowerShell
   Get-Content .env | Select-String "DATABASE_URL"
   ```

   Make sure it's set to a **local PostgreSQL** connection, not Railway:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/robotops
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✅ Database connection successful
   🚀 Server running on http://localhost:8000
   📡 CORS configured for origins: http://localhost:5173,http://127.0.0.1:5173
   📝 Health check: http://localhost:8000/health
   ```

## Common Issues

### 1. Database Connection Failed

**Error:** `EACCES` or database connection error

**Solution:**
- Make sure PostgreSQL is running
- Check your DATABASE_URL is correct
- Create the database: `createdb robotops` (or your database name)
- Run migrations: `npm run db:migrate`

### 2. Port 8000 Already in Use

**Error:** `EADDRINUSE: address already in use :::8000`

**Solution:**
```bash
# Find and kill the process using port 8000
# Windows PowerShell:
netstat -ano | findstr :8000
# Then kill the process:
taskkill /PID <PID> /F

# Or change PORT in .env file
```

### 3. DATABASE_URL Not Set

**Error:** Server starts but API calls fail

**Solution:**
- Copy `env.example` to `.env`: `cp env.example .env`
- Edit `.env` and set `DATABASE_URL`
- Restart the server

## Testing

1. **Test health endpoint:**
   ```bash
   curl http://localhost:8000/health
   # Or in browser: http://localhost:8000/health
   ```

2. **Test from frontend:**
   - Make sure frontend is running: `cd frontend && npm run dev`
   - Open `http://localhost:5173`
   - Try to register or login

## Server Status

Check if server is running:
```bash
# Test connection
Test-NetConnection -ComputerName localhost -Port 8000

# Or check processes
Get-Process -Name node | Where-Object { $_.Path -like "*nodejs*" }
```

