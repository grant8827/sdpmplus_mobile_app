// Manual mock: the real native module isn't available under Jest.
// See src/services/auth/authStorage.ts for the only consumer.
module.exports = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
};
