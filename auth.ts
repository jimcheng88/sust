import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';

// Environment variables would be defined in wrangler.toml
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1d';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  user_type: 'sme' | 'consultant';
  created_at: string;
  updated_at: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  profile_complete: boolean;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash' | 'mfa_secret'>;
  token: string;
  requiresMfa?: boolean;
}

export async function registerUser(
  db: D1Database,
  email: string,
  name: string,
  password: string,
  userType: 'sme' | 'consultant'
): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hash(password, 10);

  // Generate user ID
  const userId = nanoid();
  const now = new Date().toISOString();

  // Create user
  await db
    .prepare(
      'INSERT INTO users (id, email, name, password_hash, user_type, created_at, updated_at, mfa_enabled, profile_complete) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(userId, email, name, passwordHash, userType, now, now, false, false)
    .run();

  // Get created user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('Failed to create user');
  }

  // Generate JWT token
  const token = sign(
    { 
      userId: user.id, 
      email: user.email,
      userType: user.user_type
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Return user data and token
  const { password_hash, mfa_secret, ...userWithoutSensitiveData } = user;
  
  return {
    user: userWithoutSensitiveData,
    token
  };
}

export async function loginUser(
  db: D1Database,
  email: string,
  password: string
): Promise<AuthResponse> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Check if MFA is enabled
  if (user.mfa_enabled) {
    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token: '',
      requiresMfa: true
    };
  }

  // Generate JWT token
  const token = sign(
    { 
      userId: user.id, 
      email: user.email,
      userType: user.user_type
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Return user data and token
  const { password_hash, mfa_secret, ...userWithoutSensitiveData } = user;
  
  return {
    user: userWithoutSensitiveData,
    token
  };
}

export async function verifyMfa(
  db: D1Database,
  userId: string,
  mfaCode: string
): Promise<AuthResponse> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user || !user.mfa_enabled || !user.mfa_secret) {
    throw new Error('Invalid user or MFA not enabled');
  }

  // Verify MFA code
  // In a real implementation, you would use a library like 'otplib' to verify TOTP codes
  // For this example, we'll just simulate verification
  const isCodeValid = mfaCode === '123456'; // Placeholder for actual verification
  
  if (!isCodeValid) {
    throw new Error('Invalid MFA code');
  }

  // Generate JWT token
  const token = sign(
    { 
      userId: user.id, 
      email: user.email,
      userType: user.user_type
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Return user data and token
  const { password_hash, mfa_secret, ...userWithoutSensitiveData } = user;
  
  return {
    user: userWithoutSensitiveData,
    token
  };
}

export async function setupMfa(
  db: D1Database,
  userId: string
): Promise<{ secret: string; qrCodeUrl: string }> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  // Generate MFA secret
  // In a real implementation, you would use a library like 'otplib' to generate secrets
  const secret = nanoid(16);
  
  // Generate QR code URL
  // In a real implementation, you would use a library to generate a proper URL
  const qrCodeUrl = `otpauth://totp/SustainConnect:${user.email}?secret=${secret}&issuer=SustainConnect`;

  // Store secret in database (but don't enable MFA yet - that happens after verification)
  await db
    .prepare('UPDATE users SET mfa_secret = ? WHERE id = ?')
    .bind(secret, userId)
    .run();

  return {
    secret,
    qrCodeUrl
  };
}

export async function enableMfa(
  db: D1Database,
  userId: string,
  mfaCode: string
): Promise<boolean> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user || !user.mfa_secret) {
    throw new Error('User not found or MFA not set up');
  }

  // Verify MFA code
  // In a real implementation, you would use a library like 'otplib' to verify TOTP codes
  const isCodeValid = mfaCode === '123456'; // Placeholder for actual verification
  
  if (!isCodeValid) {
    throw new Error('Invalid MFA code');
  }

  // Enable MFA
  await db
    .prepare('UPDATE users SET mfa_enabled = ? WHERE id = ?')
    .bind(true, userId)
    .run();

  return true;
}

export async function disableMfa(
  db: D1Database,
  userId: string,
  password: string
): Promise<boolean> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isPasswordValid = await compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  // Disable MFA
  await db
    .prepare('UPDATE users SET mfa_enabled = ?, mfa_secret = ? WHERE id = ?')
    .bind(false, null, userId)
    .run();

  return true;
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; userType: string }> {
  try {
    const decoded = verify(token, JWT_SECRET) as { userId: string; email: string; userType: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export async function requestPasswordReset(
  db: D1Database,
  email: string
): Promise<boolean> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();

  if (!user) {
    // For security reasons, don't reveal that the user doesn't exist
    return true;
  }

  // Generate reset token
  const resetToken = nanoid(32);
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + 1); // Token valid for 1 hour

  // Store reset token in database
  // In a real implementation, you would have a password_resets table
  // For this example, we'll just simulate the process
  
  // In a real implementation, you would send an email with the reset link
  // For this example, we'll just simulate the process

  return true;
}

export async function resetPassword(
  db: D1Database,
  resetToken: string,
  newPassword: string
): Promise<boolean> {
  // In a real implementation, you would verify the reset token
  // For this example, we'll just simulate the process
  
  // Hash new password
  const passwordHash = await hash(newPassword, 10);

  // Update user password
  // In a real implementation, you would find the user by reset token
  // For this example, we'll just simulate the process
  
  return true;
}

export async function updatePassword(
  db: D1Database,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await compare(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await hash(newPassword, 10);

  // Update password
  await db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, userId)
    .run();

  return true;
}

export async function getUserById(
  db: D1Database,
  userId: string
): Promise<Omit<User, 'password_hash' | 'mfa_secret'>> {
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  const { password_hash, mfa_secret, ...userWithoutSensitiveData } = user;
  return userWithoutSensitiveData;
}

export async function updateUser(
  db: D1Database,
  userId: string,
  userData: Partial<User>
): Promise<Omit<User, 'password_hash' | 'mfa_secret'>> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  // Update user data
  const { id, email, password_hash, user_type, created_at, mfa_enabled, mfa_secret, ...updatableFields } = userData;
  
  // Only allow updating certain fields
  const now = new Date().toISOString();
  
  await db
    .prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
    .bind(userData.name || user.name, now, userId)
    .run();

  // Get updated user
  return getUserById(db, userId);
}

export async function deleteUser(
  db: D1Database,
  userId: string,
  password: string
): Promise<boolean> {
  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isPasswordValid = await compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  // Delete user
  await db
    .prepare('DELETE FROM users WHERE id = ?')
    .bind(userId)
    .run();

  return true;
}

// Audit logging for GDPR compliance
export async function logAuditEvent(
  db: D1Database,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: any,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const id = nanoid();
  const now = new Date().toISOString();
  
  await db
    .prepare(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent, now)
    .run();
}
