const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGoogleServices = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const base64 = process.env.GOOGLE_SERVICES_JSON;
      
      if (!base64) {
        console.warn('⚠️  GOOGLE_SERVICES_JSON not found in environment');
        return config;
      }

      console.log('🔧 Decoding google-services.json from environment...');
      
      const content = Buffer.from(base64, 'base64').toString('utf-8');
      const projectRoot = config.modRequest.projectRoot;
      const filePath = path.join(projectRoot, 'google-services.json');
      
      fs.writeFileSync(filePath, content);
      console.log('✅ google-services.json created successfully');
      
      return config;
    },
  ]);
};

module.exports = withGoogleServices;