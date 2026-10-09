module.exports = {
  preset: 'react-native',
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  // These ship untranspiled ESM and need to go through Babel like RN itself does.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        '@react-native',
        'react-native',
        '@react-navigation',
        'react-native-gesture-handler',
        'react-native-screens',
        'react-native-safe-area-context',
        'react-native-encrypted-storage',
        'react-native-image-picker',
        '@react-native-community/geolocation',
      ].join('|') +
      ')/)',
  ],
};
