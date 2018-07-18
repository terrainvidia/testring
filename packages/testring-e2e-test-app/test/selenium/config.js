module.exports = {
  retryCount: 0,
  tests: 'test/selenium/test/*.spec.js',
  plugins: [
    'selenium-driver',
    ['babel', {
      presets: [
        'es2015'
      ]
    }]
  ]
};
