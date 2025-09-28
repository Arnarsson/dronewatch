/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/incidents',
        destination: 'http://localhost:8081/api/incidents',
      },
    ]
  },
}

module.exports = nextConfig