/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'londonbridgeproject.s3.eu-north-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'londonbridgeprojt.s3.eu-west-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        port: '',
        pathname: '/**',
      }
    ],
    domains: ['localhost', 'londonbridgeproject.s3.eu-north-1.amazonaws.com', 'londonbridgeprojt.s3.eu-west-1.amazonaws.com'],
  },
  // ESLint hatalarını build sırasında ignore et
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Output standalone ayarı
  output: 'standalone',
  // Harici paketler
  serverExternalPackages: ['@prisma/client'],
  // Sabit çıktı seçeneği
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_ADMIN_EMAIL: 'admin@example.com',
    NEXT_PUBLIC_ADMIN_PASSWORD: 'admin123',
  },
};

module.exports = nextConfig; 