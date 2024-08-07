const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (() => {
  /** @type {import('expo/metro-config').MetroConfig} */
  const config = getDefaultConfig(__dirname);

  const { resolver, transformer } = config;

  config.transformer = {
    ...transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  };

  config.resolver = {
    ...resolver,
    assetExts: [...resolver.assetExts, 'tflite'], // Add 'tflite' to asset extensions
  };

  return config;
})();