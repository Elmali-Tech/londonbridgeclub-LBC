import { supabase } from './supabase';
import { User } from '../types/database';
import { createHash, randomBytes } from 'crypto';

// Şifreleri hashleme
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Rastgele token oluşturma
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Kullanıcı kaydı
export async function register(email: string, password: string, fullName: string, status: 'personal' | 'corporate' = 'personal', linkedinUrl?: string): Promise<User | null> {
  try {
    // Email kontrolü
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Email already exists');
    }
    
    // Şifreyi hashle
    const passwordHash = hashPassword(password);
    
    // Kullanıcıyı ekle
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          email, 
          password_hash: passwordHash, 
          full_name: fullName,
          status,
          linkedin_url: linkedinUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

// Kullanıcı girişi
export async function login(email: string, password: string): Promise<{user: User, token: string} | null> {
  try {
    // Şifreyi hashle
    const passwordHash = hashPassword(password);
    
    // Kullanıcıyı bul
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', passwordHash);
    
    if (userError || !users || users.length === 0) {
      return null;
    }
    
    const user = users[0];
    
    // Token oluştur
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 günlük token
    
    // Session kaydı
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert([
        {
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }
      ]);
    
    if (sessionError) {
      throw sessionError;
    }
    
    return { user, token };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Token doğrulama
export async function validateToken(token: string): Promise<User | null> {
  try {
    // console.log('validateToken - Token kontrolü başladı');
    
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString());
    
    // console.log('validateToken - Session sorgusu sonucu:', { sessions, sessionError });
    
    if (sessionError || !sessions || sessions.length === 0) {
      // console.log('validateToken - Geçerli session bulunamadı');
      return null;
    }
    
    const session = sessions[0];
    // console.log('validateToken - Session bulundu:', session);
    
    // Kullanıcıyı getir
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user_id);
    
    // console.log('validateToken - Kullanıcı sorgusu sonucu:', { users, userError });
    
    if (userError || !users || users.length === 0) {
      // console.log('validateToken - Kullanıcı bulunamadı');
      return null;
    }
    
    // console.log('validateToken - Kullanıcı bulundu:', users[0]);
    return users[0];
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// Çıkış yap
export async function logout(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token', token);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

// Validate session from request headers — returns full User object (includes is_admin)
export async function validateSession(request: Request): Promise<User | null> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString());

    if (sessionError || !sessions || sessions.length === 0) {
      return null;
    }

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessions[0].user_id);

    if (userError || !users || users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('validateSession - Error:', error);
    return null;
  }
} 