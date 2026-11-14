const nextConfig = {
  agentRules: false,
  poweredByHeader: false,
  experimental: { externalDir: true },
  // The report resolves photos from validated survey paths at runtime. Static
  // asset serving does not place those bytes in the serverless function bundle.
  outputFileTracingIncludes: {
    '/api/curb/survey': ['./src/data/curb/surveys/robertson-hall.json'],
    '/api/curb/survey/report': [
      './src/data/curb/surveys/robertson-hall.json',
      ...['01', '02', '03', '04', '05'].map(id => `./public/curb/surveys/robertson-hall/defect-${id}.jpg`),
    ],
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};
export default nextConfig;
