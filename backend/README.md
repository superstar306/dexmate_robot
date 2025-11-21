# RobotOps Backend API

Node.js/Express backend for the RobotOps Robot Management System.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL (using `pg` driver)
- **Authentication**: JWT (jsonwebtoken)
- **Language**: TypeScript
- **Validation**: express-validator

## Prerequisites

- Node.js 20+
- PostgreSQL 12+
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (copy from `env.example`):

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

**Environment Variables Explained:**

- `NODE_ENV` - Environment mode (`development` or `production`)
- `PORT` - Server port (default: 8000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for signing JWT tokens (use a strong random string in production)
- `JWT_ACCESS_EXPIRES_IN` - Access token expiration (default: 30m)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)
- `ALLOWED_HOSTS` - Comma-separated list of allowed hostnames

### 3. Database Setup

#### Local PostgreSQL Setup

1. Create a PostgreSQL database:

```bash
createdb robot_manager
```

2. Update `DATABASE_URL` in `.env` with your database credentials

#### Run Migrations

Run migrations to create the database schema:

```bash
npm run db:migrate
```

This will execute the SQL schema in `src/db/schema.sql` to create all necessary tables, indexes, and constraints.

**Database Schema:**
- **users** - User accounts with roles (user/admin)
- **groups** - User groups for collaboration
- **group_memberships** - Group membership records with roles
- **robots** - Robot entities (owned by users or groups)
- **robot_permissions** - User permissions on robots (usage/admin)
- **robot_settings** - User-specific robot settings (JSON)

### 4. Run the Server

Development mode (with hot reload):

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

The server will start on `http://localhost:8000` (or the port specified in `PORT`).

**Health Check:**
- Visit `http://localhost:8000/health` to verify the server is running

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  - Body: `{ email, password, name, username }`
  - Returns: `{ access, refresh }` tokens

- `POST /api/auth/login` - Login
  - Body: `{ email, password }`
  - Returns: `{ access, refresh }` tokens

- `POST /api/auth/refresh` - Refresh access token
  - Body: `{ refresh }` (refresh token)
  - Returns: `{ access, refresh? }` (new access token, optional new refresh token)

### Users

- `GET /api/auth/me` - Get current user profile
  - Requires: Authentication
  - Returns: User object with stats

- `PUT /api/auth/me` - Update current user profile
  - Requires: Authentication
  - Body: `{ name?, username?, role? }` (role only if user is admin)
  - Returns: Updated user object

- `GET /api/auth/users` - List all active users
  - Requires: Authentication
  - Returns: Array of user objects

### Robots

- `GET /api/robots` - List accessible robots
  - Requires: Authentication
  - Query params: `page?`, `pageSize?`
  - Returns: Paginated list of robots user has access to

- `POST /api/robots` - Create a robot
  - Requires: Authentication
  - Body: `{ serialNumber, name, ownerType, ownerId? }`
  - Returns: Created robot object

- `GET /api/robots/:serialNumber` - Get robot details
  - Requires: Authentication + permission
  - Returns: Robot object with permissions

- `PUT /api/robots/:serialNumber` - Update robot
  - Requires: Authentication + admin permission
  - Body: `{ name? }`
  - Returns: Updated robot object

- `DELETE /api/robots/:serialNumber` - Delete robot
  - Requires: Authentication + owner or admin permission
  - Returns: 204 No Content

- `POST /api/robots/:serialNumber/assign` - Assign robot to user
  - Requires: Authentication + admin permission
  - Body: `{ userId }`
  - Returns: Assignment confirmation

- `POST /api/robots/:serialNumber/permissions` - Grant permission
  - Requires: Authentication + admin permission
  - Body: `{ userId, permission }` (permission: "usage" or "admin")
  - Returns: Permission object

- `DELETE /api/robots/:serialNumber/permissions/:userId` - Revoke permission
  - Requires: Authentication + admin permission
  - Returns: 204 No Content

- `GET /api/robots/:serialNumber/settings` - Get robot settings
  - Requires: Authentication + permission
  - Returns: User's settings for this robot (JSON)

- `PUT /api/robots/:serialNumber/settings` - Update robot settings
  - Requires: Authentication + permission
  - Body: `{ settings }` (JSON object)
  - Returns: Updated settings

- `GET /api/robots/my-settings` - Get all my robot settings
  - Requires: Authentication
  - Returns: Array of all user's robot settings

### Groups

- `GET /api/groups` - List groups
  - Requires: Authentication
  - Returns: Array of groups user belongs to

- `POST /api/groups` - Create a group
  - Requires: Authentication
  - Body: `{ name }`
  - Returns: Created group object (creator becomes admin)

- `GET /api/groups/:id` - Get group details
  - Requires: Authentication + membership
  - Returns: Group object with members and robots

- `DELETE /api/groups/:id` - Delete group
  - Requires: Authentication + admin membership
  - Returns: 204 No Content

- `POST /api/groups/:id/members` - Add/update member
  - Requires: Authentication + admin membership
  - Body: `{ userId, role }` (role: "admin" or "member")
  - Returns: Membership object

- `DELETE /api/groups/:id/members/:userId` - Remove member
  - Requires: Authentication + admin membership
  - Returns: 204 No Content

- `GET /api/groups/:id/robots` - List group robots
  - Requires: Authentication + membership
  - Returns: Array of robots owned by the group

- `POST /api/groups/:id/robots` - Create group robot
  - Requires: Authentication + admin membership
  - Body: `{ serialNumber, name }`
  - Returns: Created robot object

## Project Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── robot.controller.ts
│   │   └── group.controller.ts
│   ├── routes/         # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── robot.routes.ts
│   │   └── group.routes.ts
│   ├── services/       # Business logic
│   │   ├── user.service.ts
│   │   └── robot.service.ts
│   ├── middleware/     # Express middleware
│   │   ├── auth.ts          # JWT authentication
│   │   ├── errorHandler.ts  # Error handling
│   │   └── validate.ts      # Request validation
│   ├── lib/            # Utilities
│   │   ├── db.ts            # Database connection pool
│   │   ├── jwt.ts           # JWT token utilities
│   │   └── password.ts      # Password hashing
│   ├── types/          # TypeScript types
│   │   └── index.ts
│   ├── db/             # Database migrations and schema
│   │   ├── migrate.ts       # Migration script
│   │   └── schema.sql       # Database schema
│   └── server.ts       # Application entry point
├── dist/               # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── Procfile            # Railway deployment config
├── railway.json        # Railway configuration
├── nixpacks.toml       # Build configuration
└── env.example         # Environment variables template
```

## Development

### Type Checking

```bash
npm run build
```

This compiles TypeScript and will show any type errors.

### Database Schema Changes

1. Update `src/db/schema.sql` with your changes
2. Run migration: `npm run db:migrate`

**Note:** The migration script will execute the entire schema file. For production, consider using a proper migration system for incremental changes.

### Linting

```bash
npm run lint
```

## Deployment

### Railway (Docker)

The backend is configured for Railway deployment using Docker:

- **Docker builder** - Uses Dockerfile for consistent builds
- **Automatic migrations** - Runs on deploy via `release` command in Procfile
- **Environment variables** - Configured via Railway dashboard

#### Docker Configuration

- `Dockerfile` - Docker build configuration
  - Base image: Node.js 20 LTS
  - Installs all dependencies (including devDependencies for build)
  - Compiles TypeScript to JavaScript
  - Keeps `tsx` and `typescript` for database migrations
  - Removes other devDependencies to reduce image size

- `.dockerignore` - Files excluded from Docker build
  - Excludes `node_modules`, `dist`, `.env`, logs, etc.

- `railway.json` - Railway deployment configuration
  - Builder: Dockerfile
  - Restart policy: ON_FAILURE with max 10 retries

- `Procfile` - Process definitions
  - `web: npm start` - Main server process
  - `release: npm run db:migrate` - Runs migrations before deployment

#### Alternative: Nixpacks Builder

If you prefer to use Nixpacks instead of Docker:

- `nixpacks.toml` - Nixpacks build configuration
  - Node.js 20
  - Build steps: `npm ci` → `npm run build`
  - Start command: `npm start`

To use Nixpacks, update `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  }
}
```

#### Environment Variables (Production)

Set these in Railway dashboard:

- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Railway PostgreSQL service)
- `JWT_SECRET` - Strong secret key for JWT tokens (64+ characters recommended)
- `NODE_ENV=production`
- `PORT` - Set automatically by Railway
- `JWT_ACCESS_EXPIRES_IN=30m` (optional)
- `JWT_REFRESH_EXPIRES_IN=7d` (optional)
- `ALLOWED_HOSTS=*.railway.app,your-custom-domain.com` (optional)

**Generate JWT Secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Deployment Steps

1. Connect GitHub repository to Railway
2. Add PostgreSQL service (Railway will provide `DATABASE_URL`)
3. Set root directory to `backend` in service settings
4. Add environment variables
5. Deploy - Railway will automatically:
   - Build Docker image using `Dockerfile`
   - Run `npm ci` to install dependencies
   - Run `npm run build` to compile TypeScript
   - Run `npm run db:migrate` (release command) to migrate database
   - Run `npm start` to start the server

#### Docker Build Process

The Dockerfile performs the following steps:

1. **Setup**: Uses Node.js 20 LTS base image
2. **Install**: Runs `npm ci` to install all dependencies
3. **Build**: Runs `npm run build` to compile TypeScript
4. **Optimize**: Removes unnecessary devDependencies (keeps `tsx` and `typescript` for migrations)
5. **Start**: Runs `npm start` to start the server

#### Building Docker Image Locally

To test the Docker build locally:

```bash
# Build the image
docker build -t robotops-backend .

# Run the container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  robotops-backend
```

#### Docker Benefits

- **Consistent builds** across all environments
- **Faster deployments** with proper layer caching
- **Better control** over the build process
- **No dependency** on Nixpacks detection
- **Reproducible** builds every time

#### Troubleshooting Railway Deployment

**Docker build fails:**
- Verify root directory is set to `backend` (not `backend/`)
- Check that `Dockerfile` exists in `backend` directory
- Ensure `package.json` exists in `backend` directory
- Check Railway build logs for specific errors
- Verify Dockerfile syntax is correct

**Nixpacks build fails (if using Nixpacks):**
- Verify root directory is set to `backend` (not `backend/`)
- Check that `package.json` exists in `backend` directory
- Ensure `nixpacks.toml` is present
- Check Railway build logs for specific errors

**Database connection fails:**
- Verify `DATABASE_URL` is set (should be auto-provided by Railway PostgreSQL)
- Check that PostgreSQL service is running
- Verify database credentials in `DATABASE_URL`

**Migrations fail:**
- Check that `src/db/schema.sql` is valid SQL
- Verify database connection before migrations run
- Check Railway logs for detailed error messages

**Server doesn't start:**
- Verify `JWT_SECRET` is set
- Check that `dist/server.js` exists after build
- Review Railway logs for startup errors
- Ensure `PORT` environment variable is available (Railway provides this)

### Manual Deployment

#### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t robotops-backend .
   ```

2. Run the container with environment variables:
   ```bash
   docker run -d \
     -p 8000:8000 \
     -e NODE_ENV=production \
     -e DATABASE_URL=postgresql://user:pass@host:5432/db \
     -e JWT_SECRET=your-secret \
     --name robotops-backend \
     robotops-backend
   ```

3. Run migrations (if not using Procfile release command):
   ```bash
   docker exec robotops-backend npm run db:migrate
   ```

#### Without Docker

1. Set `NODE_ENV=production`
2. Set a strong `JWT_SECRET`
3. Configure `DATABASE_URL` with production PostgreSQL
4. Build: `npm run build`
6. Run migrations: `npm run db:migrate`
7. Start server: `npm start`

For production, consider using:
- Process manager (PM2, systemd)
- Reverse proxy (Nginx)
- SSL/TLS certificates (Let's Encrypt)
- Docker with docker-compose for orchestration

## Security Notes

- **JWT Secret**: Use a strong, random secret (64+ characters) in production
- **Password Hashing**: Uses bcryptjs with salt rounds
- **Input Validation**: All inputs validated using express-validator
- **SQL Injection**: Uses parameterized queries via `pg` driver
- **Environment Variables**: Never commit `.env` files

## License

ISC
