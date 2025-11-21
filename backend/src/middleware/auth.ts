import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { query } from '../lib/db.js';
import { createError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    name?: string | null;
    role: 'USER' | 'ADMIN';
    isStaff: boolean;
    isSuperuser: boolean;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Authentication required', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Fetch user from database
    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
      role: 'USER' | 'ADMIN';
      is_staff: boolean;
      is_superuser: boolean;
      is_active: boolean;
    }>(
      'SELECT id, email, username, name, role, is_staff, is_superuser, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      throw createError('User not found or inactive', 401);
    }

    const user = userResult.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      isStaff: user.is_staff,
      isSuperuser: user.is_superuser,
    };
    next();
  } catch (error: any) {
    if (error.statusCode) {
      return next(error);
    }
    next(createError('Invalid or expired token', 401));
  }
}
