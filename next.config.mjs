/** @type {import('next').NextConfig} */
const nextConfig = {
  // @moss-dev/moss ships native Rust bindings (.node files).
  // Exclude both packages from webpack bundling so Node.js require()s them at runtime.
  // In Next.js 14 this lives under `experimental`; it will graduate to top-level in v15.
  experimental: {
    serverComponentsExternalPackages: ["@moss-dev/moss", "@moss-dev/moss-core"],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // Belt-and-suspenders: also tell webpack to treat .node binaries as external assets
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        "@moss-dev/moss",
        "@moss-dev/moss-core",
      ].filter(Boolean);
    }
    return config;
  },
};

export default nextConfig;
