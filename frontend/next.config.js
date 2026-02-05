/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API proxy in dev optional: rewrites to backend
  async rewrites() {
    return process.env.NEXT_PUBLIC_API_URL
      ? []
      : [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }];
  },
};

module.exports = nextConfig;
