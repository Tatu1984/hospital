module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated has to be the LAST plugin in the list. expo-router and
      // moti both rely on the worklet transforms it sets up.
      'react-native-reanimated/plugin',
    ],
  };
};
