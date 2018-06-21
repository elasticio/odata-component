'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const { parse, convert } = require('odata2openapi');


describe('Parse All Files Tests', async function Dummy() {
  const rawCsdlFiles = fs.readdirSync('./spec/samples/rawCsdlFiles');
  rawCsdlFiles.forEach(file => {
    it(`${file} Test`, async function () {
      const csdlString = fs.readFileSync(`./spec/samples/rawCsdlFiles/${file}`).toString();
      const service = await parse(csdlString);
      fs.writeFileSync(`./spec/samples/serviceDescriptions/${file.substr(0, file.lastIndexOf("."))}.json`, JSON.stringify(service, null, 2));
      const openApiDefinition = convert(service.entitySets, service, service.version);
      fs.writeFileSync(`./spec/samples/processedOpenApiFiles/${file.substr(0, file.lastIndexOf("."))}.json`, JSON.stringify(openApiDefinition, null, 2));
      expect(true).to.be.true;
    });
  });
});
