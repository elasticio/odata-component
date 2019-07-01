// Ensure that module.js can be loaded.

const { expect } = require('chai');

describe('Load Module Test', () => {
  it('Ensure that module.js can be loaded', () => {
    // eslint-disable-next-line no-unused-vars,global-require
    const module = require('../module');
    // eslint-disable-next-line no-unused-expressions
    expect(true).to.be.true;
  });
});
