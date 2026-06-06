module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@nozbe/watermelondb/babel/plugin'],
      'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
