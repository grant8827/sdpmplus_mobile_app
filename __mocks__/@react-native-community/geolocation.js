// Manual mock: the real native module isn't available under Jest.
// See src/screens/parent/DropoffPickupScreen.tsx for the only consumer.
module.exports = {
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn(success =>
    success({
      coords: { latitude: 0, longitude: 0, accuracy: 0, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    }),
  ),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
};
