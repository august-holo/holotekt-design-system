import type { NextConfig } from "next";

// A plain static export: no transpilePackages, no CSS configuration, nothing design-system specific.
const config: NextConfig = { output: "export" };
export default config;
