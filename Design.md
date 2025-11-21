RobotOps - Design Overview

RobotOps is a full-stack web app for managing robots, user groups, and permissions. It uses a Node.js/Express TypeScript backend and a React TypeScript frontend with PostgreSQL for data storage.

Technology Choices
Backend

Node.js + Express + TypeScript
Unified language for frontend and backend
Non-blocking I/O for handling concurrent requests
Lightweight, flexible, and easy to deploy
TypeScript ensures type safety and better refactoring

PostgreSQL
Relational model fits users, groups, robots, permissions
ACID-compliant and reliable
JSON columns used for flexible robot settings

JWT Authentication
Stateless and scalable
Works across multiple servers and mobile apps
Uses refresh tokens for security

Direct SQL with pg driver
Faster than ORMs, full control over queries
Simple migrations via single SQL schema file

Frontend
React + TypeScript
Component-based architecture, reusable UI
Type-safe API calls and state management

Vite
Extremely fast development server and HMR
Optimized production builds with tree-shaking and code splitting

React Query (TanStack Query)
Handles API caching, loading states, and optimistic updates

React Router
Simple, declarative routing with nested routes support

Architecture Decisions

Backend
Layered structure: Routes → Controllers → Services → Database
Manual SQL migrations for simplicity
JWT stored in localStorage for stateless authentication

Frontend
Feature-based structure: Pages → Components → API Client
Centralized API client for auth and error handling
React Query for all server state, use React state for UI state only

Deployment
Backend on Railway, frontend on Vercel
Environment variables used for sensitive config
CORS currently open for demo, should be restricted in production

Performance & Security

Backend
PostgreSQL connection pooling
Parameterized queries to prevent SQL injection
Indexes on frequently queried columns

Frontend

Code splitting and lazy loading via Vite
React Query caching and optimistic updates
Security

Passwords hashed with bcrypt
JWT secrets stored securely
Input validation on all user inputs
CORS and environment variables managed carefully
Scalability & Future Improvements

Current setup: single database, no caching, no rate limiting

Future enhancements:
Redis for caching and session storage
Read replicas for scaling reads
Rate limiting to prevent abuse
Monitoring with Sentry or DataDog
CDN for static assets (Vercel provides this)

Conclusion
This stack prioritizes:
Developer Experience: Fast iteration with TypeScript and Vite
Performance: Optimized builds, efficient backend
Simplicity: Clear structure, minimal dependencies
Scalability: Stateless design, room to grow
The design strikes a balance between productivity, maintainability, and performance while keeping the system understandable and easy to extend.