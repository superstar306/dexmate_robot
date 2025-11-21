import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../lib/db.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateTokens, verifyToken } from '../lib/jwt.js';
import { createError } from '../middleware/errorHandler.js';
import { getUserStats } from '../services/user.service.js';

interface RegisterRequest extends Request {
  body: {
    email: string;
    password: string;
    username?: string;
    name?: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface RefreshRequest extends Request {
  body: {
    refresh: string;
  };
}

export async function register(req: RegisterRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
      }));
      return next(createError(errorMessages.map(e => e.message).join(', '), 400));
    }

    const { email, password, username, name } = req.body;
    const finalUsername = username || email.split('@')[0];

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, finalUsername]
    );

    if (existingUser.rows.length > 0) {
      return next(createError('User with this email or username already exists', 400));
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
      role: 'USER' | 'ADMIN';
      is_staff: boolean;
      is_superuser: boolean;
      date_joined: Date;
    }>(
      `INSERT INTO users (email, username, name, password, role) 
       VALUES ($1, $2, $3, $4, 'USER') 
       RETURNING id, email, username, name, role, is_staff, is_superuser, date_joined`,
      [email, finalUsername, name || null, hashedPassword]
    );

    const user = userResult.rows[0];

    // Generate tokens
    const tokens = generateTokens({ userId: user.id, email: user.email });

    // Get user stats
    const stats = await getUserStats(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        isStaff: user.is_staff,
        isSuperuser: user.is_superuser,
        dateJoined: user.date_joined,
        stats,
      },
      access: tokens.access,
      refresh: tokens.refresh,
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return next(createError('User with this email or username already exists', 400));
    }
    next(error);
  }
}

export async function login(req: LoginRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
      }));
      return next(createError(errorMessages.map(e => e.message).join(', '), 400));
    }

    const { email, password } = req.body;

    // Find user
    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
      password: string;
      role: 'USER' | 'ADMIN';
      is_staff: boolean;
      is_superuser: boolean;
      is_active: boolean;
      date_joined: Date;
    }>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return next(createError('Invalid email or password', 401));
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return next(createError('Invalid email or password', 401));
    }

    // Generate tokens
    const tokens = generateTokens({ userId: user.id, email: user.email });

    // Get user stats
    const stats = await getUserStats(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        isStaff: user.is_staff,
        isSuperuser: user.is_superuser,
        dateJoined: user.date_joined,
        stats,
      },
      access: tokens.access,
      refresh: tokens.refresh,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function refreshToken(req: RefreshRequest, res: Response, next: NextFunction) {
  try {
    const { refresh } = req.body;

    if (!refresh) {
      return next(createError('Refresh token is required', 400));
    }

    // Verify refresh token
    const payload = verifyToken(refresh);

    // Get user
    const userResult = await query<{
      id: number;
      email: string;
      is_active: boolean;
    }>(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return next(createError('Invalid refresh token', 401));
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const tokens = generateTokens({ userId: user.id, email: user.email });

    res.json({
      access: tokens.access,
      refresh: tokens.refresh,
    });
  } catch (error: any) {
    next(createError('Invalid or expired refresh token', 401));
  }
}
