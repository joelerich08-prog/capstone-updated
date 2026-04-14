/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next-build',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
