import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import logger from '../helpers/logger.js';

const AuthService = {
  async register({ username, email, password, fullName }) {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw Object.assign(new Error('Username already taken'), { statusCode: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      passwordHash,
      fullName,
    });

    const token = this.generateToken(user);

    logger.info(`New user registered: ${user.email}`);

    return { user, token };
  },

  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    if (!user.is_active) {
      throw Object.assign(new Error('Account has been deactivated'), { statusCode: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    await User.updateLastLogin(user.id);

    const token = this.generateToken(user);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      token,
    };
  },

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );
  },

  async verifyToken(token) {
    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 401 });
    }
    return user;
  },

  async forgotPassword(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    // Generate a short-lived reset token (1 hour)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, purpose: 'password-reset' },
      env.jwt.secret,
      { expiresIn: '1h' }
    );

    // Send email with reset link
    try {
      const { default: EmailService } = await import('./emailService.js');
      await EmailService.sendPasswordReset({
        email: user.email,
        fullName: user.full_name || user.username,
        resetToken,
        origin: env.corsOrigin || 'http://localhost:5173',
      });
    } catch (emailErr) {
      logger.error(`Failed to send password reset email: ${emailErr.message}`);
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  },

  async resetPassword(token, newPassword) {
    const decoded = jwt.verify(token, env.jwt.secret);
    
    if (decoded.purpose !== 'password-reset') {
      throw Object.assign(new Error('Invalid reset token'), { statusCode: 400 });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updatePassword(decoded.id, passwordHash);

    logger.info(`Password reset successful for user: ${user.email}`);
    return { message: 'Password has been reset successfully.' };
  },

  async updateProfile(userId, { fullName }) {
    const user = await User.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Update user in database
    await User.updateProfile(userId, { fullName });

    const updated = await User.findById(userId);
    
    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      fullName: updated.full_name,
      role: updated.role,
    };
  },
};

export default AuthService;
