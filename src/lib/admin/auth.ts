/**
 * Admin Authentication Service
 * Flexible admin login system with JWT tokens
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface AdminSession {
  admin: AdminUser;
  token: string;
  expires_at: string;
}

class AdminAuthService {
  private admin = getSupabaseAdminClient();
  private JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_SECRET || 'default-secret';

  // Login admin user
  async login(username: string, password: string): Promise<AdminSession | null> {
    try {
      // Get admin user from database
      const { data: adminUser, error } = await this.admin
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !adminUser) {
        console.log('Admin user not found or inactive:', username);
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
      if (!isValidPassword) {
        console.log('Invalid password for admin:', username);
        return null;
      }

      // Update last login
      await this.admin
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminUser.id);

      // Generate JWT token
      const token = jwt.sign(
        { 
          adminId: adminUser.id, 
          username: adminUser.username,
          role: adminUser.role,
          permissions: adminUser.permissions 
        },
        this.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      return {
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          full_name: adminUser.full_name,
          role: adminUser.role,
          permissions: adminUser.permissions,
          is_active: adminUser.is_active,
          last_login: adminUser.last_login,
          created_at: adminUser.created_at
        },
        token,
        expires_at: expiresAt.toISOString()
      };

    } catch (error) {
      console.error('Admin login error:', error);
      return null;
    }
  }

  // Verify admin token
  async verifyToken(token: string): Promise<AdminUser | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Get fresh admin data
      const { data: adminUser, error } = await this.admin
        .from('admin_users')
        .select('*')
        .eq('id', decoded.adminId)
        .eq('is_active', true)
        .single();

      if (error || !adminUser) {
        return null;
      }

      return {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        full_name: adminUser.full_name,
        role: adminUser.role,
        permissions: adminUser.permissions,
        is_active: adminUser.is_active,
        last_login: adminUser.last_login,
        created_at: adminUser.created_at
      };

    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  // Create new admin user
  async createAdmin(
    username: string, 
    email: string, 
    password: string, 
    fullName?: string,
    role: 'admin' | 'super_admin' = 'admin',
    permissions: string[] = ['read', 'write']
  ): Promise<AdminUser | null> {
    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: newAdmin, error } = await this.admin
        .from('admin_users')
        .insert({
          username,
          email,
          password_hash: passwordHash,
          full_name: fullName,
          role,
          permissions
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating admin:', error);
        return null;
      }

      return {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
        role: newAdmin.role,
        permissions: newAdmin.permissions,
        is_active: newAdmin.is_active,
        last_login: newAdmin.last_login,
        created_at: newAdmin.created_at
      };

    } catch (error) {
      console.error('Create admin error:', error);
      return null;
    }
  }

  // Change admin password
  async changePassword(adminId: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);

      const { error } = await this.admin
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('id', adminId);

      return !error;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }

  // Update admin permissions
  async updatePermissions(adminId: string, permissions: string[]): Promise<boolean> {
    try {
      const { error } = await this.admin
        .from('admin_users')
        .update({ permissions })
        .eq('id', adminId);

      return !error;
    } catch (error) {
      console.error('Update permissions error:', error);
      return false;
    }
  }

  // Deactivate admin
  async deactivateAdmin(adminId: string): Promise<boolean> {
    try {
      const { error } = await this.admin
        .from('admin_users')
        .update({ is_active: false })
        .eq('id', adminId);

      return !error;
    } catch (error) {
      console.error('Deactivate admin error:', error);
      return false;
    }
  }

  // Get all admin users
  async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const { data: admins, error } = await this.admin
        .from('admin_users')
        .select('id, username, email, full_name, role, permissions, is_active, last_login, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admins:', error);
        return [];
      }

      return admins || [];
    } catch (error) {
      console.error('Get all admins error:', error);
      return [];
    }
  }
}

export const adminAuth = new AdminAuthService();
