# RobotOps - Robot Management System

A full-stack web application for managing robots, groups, and permissions. Built with Node.js/Express TypeScript backend and React TypeScript frontend.

## Features

- **User Authentication**: JWT-based authentication with role management (Admin/User)
- **Robot Management**: Create and manage personal robots with custom settings
- **Group Management**: Create groups, manage members, and assign group-owned robots
- **Permission System**: Granular permissions (admin/usage) for robots
- **Robot Assignment**: Assign group-owned robots to specific members
- **Modern UI**: Clean, intuitive, and mobile-responsive design

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (using `pg` driver)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator

### Frontend
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router 7.9.6
- **Data Fetching**: TanStack Query (React Query) 5.90.10
- **HTTP Client**: Axios 1.13.2

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 12+ (or use Railway's managed PostgreSQL)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dexmate_robot
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (copy from `env.example`):

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=8000

DATABASE_URL=postgresql://robot_manager:robot_manager@localhost:5432/robot_manager

JWT_SECRET=your-secret-key-here-change-in-production
JWT_ACCESS_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

ALLOWED_HOSTS=localhost,127.0.0.1
```

Run database migrations:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run dev
```

The backend API will be available at: `http://localhost:8000`

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file (optional for development):

```env
VITE_API_URL=http://localhost:8000/api
```

If not set, the frontend will use `/api` proxy (configured in `vite.config.ts`).

Start the development server:

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### 4. Verify Installation

1. Open `http://localhost:5173` in your browser
2. Register a new account
3. You should see the Dashboard page

## Project Structure

```
dexmate_robot/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # Route definitions
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── lib/            # Utilities (DB, JWT, etc.)
│   │   ├── types/          # TypeScript types
│   │   ├── db/             # Database migrations and schema
│   │   └── server.ts       # Application entry point
│   ├── dist/               # Compiled JavaScript (generated)
│   ├── package.json
│   ├── tsconfig.json
│   ├── Procfile            # Railway deployment config
│   ├── railway.json        # Railway configuration
│   └── nixpacks.toml       # Build configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/            # API client and types
│   │   ├── components/     # React components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utility libraries
│   ├── dist/               # Build output (generated)
│   ├── package.json
│   ├── vite.config.ts      # Vite configuration
│   └── vercel.json         # Vercel deployment config
│
└── README.md
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh JWT token

### Users

- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `GET /api/auth/users` - List all active users

### Robots

- `GET /api/robots` - List accessible robots
- `POST /api/robots` - Create robot
- `GET /api/robots/:serialNumber` - Get robot details
- `PUT /api/robots/:serialNumber` - Update robot
- `DELETE /api/robots/:serialNumber` - Delete robot
- `POST /api/robots/:serialNumber/assign` - Assign robot to user
- `POST /api/robots/:serialNumber/permissions` - Grant permission
- `DELETE /api/robots/:serialNumber/permissions/:userId` - Revoke permission
- `GET /api/robots/:serialNumber/settings` - Get robot settings
- `PUT /api/robots/:serialNumber/settings` - Update robot settings
- `GET /api/robots/my-settings` - Get all my robot settings

### Groups

- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add/update member
- `DELETE /api/groups/:id/members/:userId` - Remove member
- `GET /api/groups/:id/robots` - List group robots
- `POST /api/groups/:id/robots` - Create group robot

## Development

### Backend Development

Type checking:

```bash
cd backend
npm run build
```

Database schema changes:

1. Update `src/db/schema.sql`
2. Run migration: `npm run db:migrate`

### Frontend Development

Build for production:

```bash
cd frontend
npm run build
```

Preview production build:

```bash
npm run preview
```

Lint code:

```bash
npm run lint
```

## Production Deployment

### Backend Deployment on Railway

#### Prerequisites
- Railway account (sign up at https://railway.app)
- GitHub repository with your code pushed

#### Step-by-Step Deployment

1. **Create Railway Project**
   - Go to https://railway.app and sign in
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select the repository

2. **Add PostgreSQL Database**
   - In your Railway project dashboard, click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically provide `DATABASE_URL` environment variable

3. **Configure Service Settings**
   - Click on your web service
   - Go to "Settings" tab
   - Set "Root Directory" to `backend`
   - Railway will automatically detect the `Dockerfile` and use Docker builder
   - Alternatively, Railway can use Nixpacks if you prefer (see backend README)

4. **Set Environment Variables**
   - In your web service, go to "Variables" tab
   - Add the following environment variables:

   ```env
   NODE_ENV=production
   JWT_SECRET=your-generated-secret-key-here
   ALLOWED_HOSTS=*.railway.app,your-custom-domain.com
   ```

   **Note:** Railway automatically provides:
   - `DATABASE_URL` (from PostgreSQL service)
   - `PORT` (automatically used by the server)

   **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **Deploy**
   - Railway will automatically deploy when you push to your GitHub repository
   - The `release` command in `Procfile` will automatically run migrations
   - Check the "Deployments" tab to see deployment status

6. **Get Your Backend URL**
   - In Railway dashboard, your service will have a generated URL like `https://your-app.railway.app`
   - Use this URL as your backend API endpoint

7. **Verify Deployment**
   - Visit `https://your-app.railway.app/health` to verify the API is running
   - Check logs in Railway dashboard for any errors

#### Railway Files Reference

The following files are configured for Railway:
- `backend/Dockerfile` - Docker build configuration (used by Railway)
- `backend/.dockerignore` - Files excluded from Docker build
- `backend/Procfile` - Defines web server and migration commands
- `backend/railway.json` - Railway configuration (Docker builder)
- `backend/nixpacks.toml` - Alternative build configuration (if using Nixpacks)
- `backend/src/db/migrate.ts` - Database migration script

#### Docker Build Process

Railway uses Docker to build and deploy the backend:
1. **Build Stage**: Installs dependencies, compiles TypeScript
2. **Release Stage**: Runs database migrations (via Procfile)
3. **Start Stage**: Starts the Node.js server

The Dockerfile:
- Uses Node.js 20 LTS
- Installs all dependencies (including devDependencies for build)
- Compiles TypeScript to JavaScript
- Keeps `tsx` and `typescript` for database migrations
- Removes other devDependencies to reduce image size

### Frontend Deployment on Vercel

#### Prerequisites
- Vercel account (sign up at https://vercel.com - free tier available)
- Railway backend deployed and URL ready
- GitHub repository with your code pushed

#### Step-by-Step Deployment

1. **Create Vercel Project**
   - Go to https://vercel.com and sign in
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Vite project

2. **Configure Project Settings**
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: Set to `frontend` (important!)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)

3. **Set Environment Variables**
   - In the "Environment Variables" section, add:

   ```env
   VITE_API_URL=https://your-railway-backend.railway.app/api
   ```

   **Important Notes:**
   - Replace `your-railway-backend.railway.app` with your actual Railway backend URL
   - The URL must include `/api` at the end
   - Example: `VITE_API_URL=https://robotops-api.railway.app/api`
   - You can set this for all environments (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your frontend
   - The first deployment may take a few minutes
   - You'll get a URL like `https://your-app.vercel.app`

5. **Verify Deployment**
   - Visit your Vercel URL: `https://your-app.vercel.app`
   - Try logging in or registering
   - Check browser console for any errors
   - Check Vercel logs if there are issues

6. **Custom Domain (Optional)**
   - In Vercel dashboard, go to "Settings" → "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

#### Vercel Files Reference

The following files are configured for Vercel:
- `frontend/vercel.json` - Vercel configuration (SPA routing, build settings)
- `frontend/vite.config.ts` - Vite build configuration (optimized for production)
- `frontend/src/api/client.ts` - API client (reads `VITE_API_URL` from environment)

## Troubleshooting

### Backend Issues

**Database connection errors:**
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Ensure database exists and credentials are correct

**Migration errors:**
- Check that `src/db/schema.sql` is valid SQL
- Verify database connection before running migrations
- Check Railway logs for detailed error messages

### Frontend Issues

**API connection errors:**
- Ensure backend is running on the correct port
- Check `VITE_API_URL` environment variable is set correctly
- Check browser console for detailed error messages

**Build errors:**
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Clear Vite cache: `rm -rf node_modules/.vite` (Unix) or delete folder (Windows)
- Check TypeScript errors: `npm run build`

**404 errors on page refresh (SPA routing):**
- The `vercel.json` file includes rewrite rules to handle SPA routing
- If you still get 404s, verify `vercel.json` is in the `frontend` directory

## Security Notes

- Never commit `.env` files to version control
- Use strong JWT secrets in production (64+ characters, random)
- Enable HTTPS in production (Railway and Vercel provide this automatically)
- Regularly update dependencies
- Review and validate all user inputs
- Use environment variables for all sensitive configuration