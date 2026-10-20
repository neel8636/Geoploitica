import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // STATIC_EXPORT=1 builds a fully static site (GitHub Pages); BASE_PATH is the repo path there.
  // Cache components (and the partial prerendering it brings) cannot run in export mode.
  ...(process.env.STATIC_EXPORT
    ? { output: "export", trailingSlash: true }
    : { cacheComponents: true, partialPrefetching: true }),
  basePath: process.env.BASE_PATH || "",
  // the base path for client code that fetches /ripples.json and /live.json
  env: { NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH || "" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
