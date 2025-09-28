/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

export default nextConfig