module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxRuntime: 'automatic'
      }]
    ],
    plugins: [
      // Comment out dotenv temporarily if having issues
      // ['module:react-native-dotenv', {
      //   moduleName: '@env',
      //   path: '.env',
      //   blacklist: null,
      //   whitelist: null,
      //   safe: false,
      //   allowUndefined: true,
      // }],
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-private-property-in-object',
      'react-native-reanimated/plugin'
    ],
  };
};