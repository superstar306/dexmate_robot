import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { query } from '../lib/db.js';
import { getUserStats } from '../services/user.service.js';
import { createError } from '../middleware/errorHandler.js';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
      role: 'USER' | 'ADMIN';
      is_staff: boolean;
      date_joined: Date;
    }>(
      'SELECT id, email, username, name, role, is_staff, date_joined FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return next(createError('User not found', 404));
    }

    const user = userResult.rows[0];
    const stats = await getUserStats(user.id);

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      isStaff: user.is_staff,
      dateJoined: user.date_joined,
      stats,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { email, username, name, role } = req.body;

    // Validate role change (only admins can change roles)
    if (role && role !== req.user.role) {
      if (req.user.role !== 'ADMIN' && !req.user.isStaff) {
        return next(createError('Only admins can change user roles', 403));
      }
    }

    // Check for duplicate email/username
    if (email && email !== req.user.email) {
      const existing = await query(
        'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
        [email, username || email, req.user.id]
      );
      if (existing.rows.length > 0) {
        return next(createError('Email or username already in use', 400));
      }
    }

    if (username && username !== req.user.username) {
      const existing = await query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      if (existing.rows.length > 0) {
        return next(createError('Username already in use', 400));
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (email) {
      updates.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }
    if (username) {
      updates.push(`username = $${paramCount}`);
      params.push(username);
      paramCount++;
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name || null);
      paramCount++;
    }
    if (role && (req.user.role === 'ADMIN' || req.user.isStaff)) {
      updates.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    if (updates.length === 0) {
      // No updates, return current user
      return getProfile(req, res, next);
    }

    params.push(req.user.id);
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, email, username, name, role, is_staff, date_joined
    `;

    const updatedResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
      role: 'USER' | 'ADMIN';
      is_staff: boolean;
      date_joined: Date;
    }>(updateQuery, params);

    const updatedUser = updatedResult.rows[0];
    const stats = await getUserStats(updatedUser.id);

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      isStaff: updatedUser.is_staff,
      dateJoined: updatedUser.date_joined,
      stats,
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return next(createError('Email or username already in use', 400));
    }
    next(error);
  }
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const usersResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
    }>(
      'SELECT id, email, username, name FROM users WHERE is_active = true ORDER BY email ASC'
    );

    res.json(usersResult.rows);
  } catch (error: any) {
    next(error);
  }
}
