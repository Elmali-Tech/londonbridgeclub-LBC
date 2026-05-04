'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Abonelik durumunuz kontrol ediliyor...');

  useEffect(() => {
    // Kullanıcı giriş yapılmamışsa ve yükleme tamamlanmışsa
    if (!authLoading && !user) {
      setStatus('error');
      setMessage('Lütfen giriş yapın');
      return;
    }

    // Kullanıcı giriş yapmışsa abonelik durumunu kontrol et
    if (user) {
      const checkSubscription = async () => {
        try {
          // Abonelik durumu active ise başarılı olarak işaretle
          if (user.subscription_status === 'active') {
            setStatus('success');
            setMessage('Aboneliğiniz aktif durumdadır.');
          } else if (user.subscription_status === 'canceled') {
            setStatus('error');
            setMessage('Aboneliğiniz iptal edilmiştir.');
          } else if (user.subscription_status === 'past_due') {
            setStatus('error');
            setMessage('Ödemenizde gecikme bulunmaktadır. Lütfen ödeme bilgilerinizi güncelleyin.');
          } else {
            setStatus('error');
            setMessage('Aktif bir aboneliğiniz bulunmamaktadır.');
          }
        } catch (error) {
          console.error('Abonelik kontrolü sırasında hata oluştu:', error);
          setStatus('error');
          setMessage('Abonelik kontrol edilirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
        }
      };

      checkSubscription();
    }
  }, [user, authLoading, router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#121212] to-[#1a1a2e] p-4">
        <div className="w-full max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#121212] border border-amber-500/10 p-8 rounded-lg shadow-2xl">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-6">
            Abonelik Doğrulama
          </h1>
          
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-4 text-gray-300">{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Doğrulandı</h2>
              <p className="text-gray-300 mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/dashboard"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Dashboard&apos;a Git
                </Link>
                <Link 
                  href="/"
                  className="bg-transparent border border-amber-500/50 hover:border-amber-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Ana Sayfa
                </Link>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Hata</h2>
              <p className="text-gray-300 mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/membership"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Üyelik Planları
                </Link>
                <Link 
                  href="/"
                  className="bg-transparent border border-amber-500/50 hover:border-amber-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Ana Sayfa
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
} 