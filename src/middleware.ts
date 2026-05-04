import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  
  // console.log('Middleware çalıştı - Path:', request.nextUrl.pathname);
  // console.log('Admin path mi:', isAdminPath);
  
  if (!isAdminPath) {
    return NextResponse.next();
  }

  // authToken cookie'sini kontrol et
  const authToken = request.cookies.get('authToken')?.value;
  // console.log('AuthToken cookie değeri:', authToken ? 'Var' : 'Yok');
  
  if (!authToken) {
    // console.log('Token bulunamadı, ana sayfaya yönlendiriliyor');
    // Token yoksa ana sayfaya yönlendir
    return NextResponse.redirect(new URL('/', request.url));
  }

  // console.log('Token bulundu, devam ediliyor');
  // Token varsa devam et - admin kontrolü layout'ta yapılacak
  return NextResponse.next();
}

// Middleware'i sadece admin yollarında çalıştır
export const config = {
  matcher: ['/admin/:path*']
}; 