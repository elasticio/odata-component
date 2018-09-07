// Ensure that module.js can be loaded.

'use strict';

const expect = require('chai').expect;

describe('Load Module Test', function () {
  it('Ensure that module.js can be loaded', function () {
    // eslint-disable-next-line no-unused-vars
    const module = require('../module');
    expect(true).to.be.true;
  });
});
