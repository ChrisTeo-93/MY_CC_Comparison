/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @kadcompare/core is a local workspace package shipped as raw TS source
  // (shared with the mobile app), so Next needs to transpile it explicitly.
  transpilePackages: ["@kadcompare/core"],
};

export default nextConfig;
