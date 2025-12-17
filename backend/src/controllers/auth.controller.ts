import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auditLogger } from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validation';
import { loginSchema, refreshTokenSchema } from '../validators';

const prisma = new PrismaClient();

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { 
        username,
        isActive: true 
      },
      include: {
        roles: {
          select: {
            permissions: true
          }
        }
      }
    });

    if (!user) {
      auditLogger.securityEvent('LOGIN_FAILED', { 
        username, 
        reason: 'invalid_user', 
        ip: req.ip 
      });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      auditLogger.securityEvent('LOGIN_FAILED', { 
        username, 
        reason: 'invalid_password', 
        ip: req.ip 
      });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        refreshToken,
        lastLogin: new Date()
      }
    });

    // Get user permissions
    const permissions = user.roles.flatMap(role => 
      role.permissions.map(p => p.name)
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user data and access token
    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions,
        tenantId: user.tenantId,
      },
      accessToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as { id: string };

    // Find user with this refresh token
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        refreshToken,
        isActive: true
      }
    });

    if (!user) {
      return res.status(403).json({ 
        error: 'FORBIDDEN',
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });

  } catch (error) {
    console.error('Refresh token error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ 
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout user
export const logout = async (req: any, res: Response) => {
  try {
    // Clear refresh token from database
    if (req.user?.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' );
  }
};

// Get current user
export const getCurrentUser = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        id: req.user.id,
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        tenantId: true,
        roles: {
          select: {
            name: true,
            permissions: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'NOT_FOUND',
        message: 'User not found'
      });
    }

    // Flatten permissions
    const permissions = user.roles.flatMap(role => 
      role.permissions.map(p => p.name)
    );

    res.json({
      ...user,
      permissions
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'NOT_FOUND',
        message: 'User not found'
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        error: 'INVALID_PASSWORD',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        passwordResetRequired: false,
        lastPasswordReset: new Date()
      }
    });

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// import { Router } from 'express';
// import { 
//   login, 
//   refreshToken, 
//   logout, 
//   getCurrentUser, 
//   changePassword 
// } from '../controllers/auth.controller';
// import { authRateLimiter } from '../middleware/rateLimit';
// import { validateBody } from '../middleware/validation';
// import { loginSchema, refreshTokenSchema, changePasswordSchema } from '../validators';
// import { authenticateToken } from '../middleware/auth';

// const router = Router();

// // Public routes
// router.post('/login', authRateLimiter, validateBody(loginSchema), login);
// router.post('/refresh-token', validateBody(refreshTokenSchema), refreshToken);

// // Protected routes
// router.use(authenticateToken);
// router.post('/logout', logout);
// router.get('/me', getCurrentUser);
// router.post('/change-password', validateBody(changePasswordSchema), changePassword);

// export default router;