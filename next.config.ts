/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // gera build estático
};
module.exports = {
  reactStrictMode: true,
  experimental: {
    reactCompiler: true,
    optimizePackageImports: ["antd"],
  },
}

module.exports = {
  experimental: {
    optimizePackageImports: ["antd"],
  },
};



module.exports = nextConfig;
