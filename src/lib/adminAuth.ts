import Cookies from 'js-cookie';

// Simple admin authentication using environment variables
export interface AdminUser {
  email: string;
  role: 'admin';
}

// Function to check if admin credentials are valid
export function validateAdminCredentials(email: string, password: string): boolean {
  const validEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com';
  const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '123456';
  
  return email === validEmail && password === validPassword;
}

// Login function for admin
export function loginAdmin(email: string, password: string): AdminUser | null {
  if (validateAdminCredentials(email, password)) {
    const admin: AdminUser = {
      email,
      role: 'admin'
    };
    
    // Store admin session in cookie
    Cookies.set('adminSession', JSON.stringify(admin), { expires: 1 }); // Expires in 1 day
    return admin;
  }
  
  return null;
}

// Get current admin from cookie
export function getCurrentAdmin(): AdminUser | null {
  const adminSession = Cookies.get('adminSession');
  
  if (adminSession) {
    try {
      return JSON.parse(adminSession) as AdminUser;
    } catch {
      return null;
    }
  }
  
  return null;
}

// Logout admin
export function logoutAdmin(): void {
  Cookies.remove('adminSession');
}

// Check if user is authenticated as admin
export function isAdminAuthenticated(): boolean {
  return getCurrentAdmin() !== null;
} 