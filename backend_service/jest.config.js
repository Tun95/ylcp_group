// backend_service/jest.config.js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/test/**/*.test.js"],
  verbose: true,
  collectCoverage: false, // No coverage reports
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
