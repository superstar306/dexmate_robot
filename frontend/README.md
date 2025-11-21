# RobotOps Frontend

React TypeScript frontend for the RobotOps Robot Management System.

## Tech Stack

- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router 7.9.6
- **Data Fetching**: TanStack Query (React Query) 5.90.10
- **HTTP Client**: Axios 1.13.2

## Prerequisites

- Node.js 18+ and npm
- Backend API running (local or deployed)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables (Optional for Development)

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000/api
```

**Note:** If `VITE_API_URL` is not set, the frontend will use `/api` proxy (configured in `vite.config.ts` for development).

### 3. Start Development Server

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── api/            # API client and types
│   │   ├── client.ts   # Axios client with auth interceptors
│   │   └── types.ts    # TypeScript types for API responses
│   ├── components/     # Reusable React components
│   │   ├── ErrorBoundary.tsx
│   │   ├── Layout.tsx
│   │   ├── PermissionBadge.tsx
│   │   ├── RobotCard.tsx
│   │   └── SettingsForm.tsx
│   ├── context/        # React context providers
│   │   └── AuthContext.tsx  # Authentication context
│   ├── pages/          # Page components
│   │   ├── AuthPage.tsx         # Login/Register
│   │   ├── DashboardPage.tsx    # Robot list
│   │   ├── RobotDetailPage.tsx  # Robot details and settings
│   │   ├── GroupAdminPage.tsx  # Group management
│   │   ├── ProfilePage.tsx      # User profile
│   │   └── MySettingsPage.tsx  # All user settings
│   ├── lib/            # Utility libraries
│   │   └── tokenStorage.ts  # JWT token storage (localStorage)
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # Application entry point
│   ├── App.css         # Global styles
│   └── index.css       # Base styles
├── public/             # Static assets
├── dist/              # Build output (generated)
├── package.json
├── vite.config.ts     # Vite configuration
├── vercel.json        # Vercel deployment configuration
└── tsconfig.json      # TypeScript configuration
```

## Features

### Authentication

- JWT-based authentication with access and refresh tokens
- Automatic token refresh on 401 errors
- Token storage in localStorage
- Protected routes with authentication checks

### Pages

- **Login/Register** - User authentication
- **Dashboard** - List of all accessible robots
- **Robot Detail** - View robot details, manage settings, and permissions
- **Group Admin** - Manage groups, members, and group robots
- **Profile** - View and update user profile
- **My Settings** - View all robot settings for current user

### API Integration

The frontend uses a centralized API client (`src/api/client.ts`) that:

- Automatically adds JWT tokens to requests
- Handles token refresh on 401 errors
- Manages token storage
- Provides type-safe API calls

**Example Usage:**

```typescript
import { apiClient } from '../api/client'

// GET request
const response = await apiClient.get('/robots')
const robots = response.data

// POST request
await apiClient.post('/robots', {
  serialNumber: 'ROBOT-001',
  name: 'My Robot'
})
```

## Development

### Building for Production

```bash
npm run build
```

This will:
1. Type check with TypeScript (`tsc -b`)
2. Build with Vite (outputs to `dist/`)
3. Optimize and minify code
4. Split vendor chunks for better caching

### Preview Production Build

```bash
npm run preview
```

This serves the `dist/` folder locally to test the production build.

### Linting

```bash
npm run lint
```

## Deployment

### Vercel

The frontend is configured for Vercel deployment with:

- **Vite framework** - Auto-detected by Vercel
- **SPA routing** - Configured in `vercel.json`
- **Environment variables** - Set via Vercel dashboard

#### Vercel Configuration Files

- `vercel.json` - Vercel deployment configuration
  - Build command: `npm run build`
  - Output directory: `dist`
  - SPA rewrites for client-side routing
  - Framework: Vite

#### Environment Variables (Production)

Set this in Vercel dashboard:

- `VITE_API_URL` - Backend API URL (e.g., `https://your-railway-backend.railway.app/api`)
  - **Important:** Must include `/api` at the end
  - No trailing slash (automatically handled)

#### Deployment Steps

1. Connect GitHub repository to Vercel
2. Set root directory to `frontend` in project settings
3. Add environment variable `VITE_API_URL`
4. Deploy - Vercel will automatically:
   - Run `npm install`
   - Run `npm run build`
   - Deploy the `dist/` folder

#### Troubleshooting Vercel Deployment

**Build fails:**
- Verify root directory is set to `frontend`
- Check that `package.json` exists in `frontend` directory
- Review Vercel build logs for specific errors
- Ensure TypeScript compilation succeeds

**API connection errors:**
- Verify `VITE_API_URL` is set correctly in Vercel environment variables
- Check that the Railway backend URL is accessible
- Verify CORS settings in backend include your Vercel URL
- Check browser console for detailed error messages

**404 errors on page refresh:**
- The `vercel.json` file includes rewrite rules to handle SPA routing
- If you still get 404s, verify `vercel.json` is in the `frontend` directory
- Ensure all routes are handled by the rewrite rule

### Manual Deployment

1. Set `VITE_API_URL` environment variable to your backend URL
2. Build: `npm run build`
3. Serve the `dist/` folder with a web server (Nginx, Apache, etc.)
4. Configure SPA routing (all routes should serve `index.html`)

**Example Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## API Client Configuration

The API client (`src/api/client.ts`) automatically:

1. **Reads API URL from environment:**
   - Development: Uses `/api` proxy if `VITE_API_URL` not set
   - Production: Requires `VITE_API_URL` to be set

2. **Handles authentication:**
   - Adds JWT access token to all requests
   - Automatically refreshes token on 401 errors
   - Redirects to login if refresh fails

3. **Manages tokens:**
   - Stores tokens in localStorage
   - Reads fresh tokens on each request
   - Clears tokens on logout or auth failure

## Styling

- Global styles in `src/index.css`
- Component styles in `src/App.css`
- Inline styles for component-specific styling
- Responsive design with mobile-friendly layouts

## TypeScript

The project uses strict TypeScript configuration:

- Type checking enabled
- Strict mode enabled
- Path aliases configured
- React types included

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2022+ features
- No IE11 support

## Security Notes

- JWT tokens stored in localStorage (consider httpOnly cookies for enhanced security)
- All API requests include authentication headers
- CORS handled by backend
- Input validation on forms
- XSS protection via React's built-in escaping

## License

ISC
