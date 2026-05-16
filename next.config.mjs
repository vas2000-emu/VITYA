/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable StrictMode's dev-only double-mount. It was tearing down the
  // r3f Canvas's WebGL context between mount #1 and #2, leaving a dead
  // <canvas> in the DOM and a black-screen experience. Production never
  // had this issue (StrictMode is dev-only). For us the trade-off is
  // worth it — clean viewport > extra effect-bug detection.
  reactStrictMode: false,
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
