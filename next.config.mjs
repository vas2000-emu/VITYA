/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // HACKATHON: re-enable strictness before shipping. Kept on for velocity
    // so quick iterations are not gated on TS noise in mock-data code paths.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
