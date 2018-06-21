'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const {convertCsdlString} = require('../lib/commons/odata/extractCsdl');

describe('Dependency Test Case', function Dummy() {
  it('First Test', async function () {
    const csdlSchema = fs.readFileSync('./spec/samples/TripPinTestCase/TripPinMetadata.xml').toString();

    const convertedResults = await convertCsdlString(csdlSchema);
    expect(true).to.be.true;
  });
});
