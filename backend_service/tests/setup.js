// backend_service/tests/setup.js
// Global test setup
const mongoose = require("mongoose");

// Mock mongoose connection
beforeAll(async () => {
  // Mock mongoose methods
  mongoose.connect = jest.fn();
  mongoose.disconnect = jest.fn();
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000);
