module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/database/**',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
};
