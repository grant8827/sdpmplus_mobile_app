import { formatAddress, parseAddress } from '../src/utils/address';

describe('structured address storage', () => {
  it('round trips an address without a second line', () => {
    const address = {
      addressLine1: '100 School Road', addressLine2: '', city: 'Atlanta',
      state: 'GA', postalCode: '30303', country: 'United States',
    };
    expect(parseAddress(formatAddress(address))).toEqual(address);
  });

  it('round trips an address with a suite or building', () => {
    const address = {
      addressLine1: '100 School Road', addressLine2: 'Building B', city: 'Atlanta',
      state: 'GA', postalCode: '30303', country: 'United States',
    };
    expect(parseAddress(formatAddress(address))).toEqual(address);
  });
});
