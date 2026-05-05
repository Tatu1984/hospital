module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated 4 (Expo SDK 54+) split its babel plugin out into the
      // separate react-native-worklets package. Must be the LAST plugin in
      // the list — moti and expo-router both rely on the worklet
      // transforms it sets up.
      'react-native-worklets/plugin',
    ],
  };
};
