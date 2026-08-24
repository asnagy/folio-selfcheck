module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      [
        'module-resolver',
        { root: ['./'], alias: { '@': './src' }, extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      ],
    ],
  };
};
