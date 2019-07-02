const { expect } = require('chai');
const fs = require('fs');
const nock = require('nock');

const { NoAuthRestClient } = require('@elastic.io/odata-library');

const ODataClient = require('../../lib/commons/odata/ODataClient');

describe('OData Client Test Cases ', () => {
  describe('fields and metadata ', () => {
    let cfg;
    let restClient;

    beforeEach(() => {
      cfg = {
        auth: { type: 'No Auth' },
        resourceServerUrl: 'http://example.com',
      };

      restClient = new NoAuthRestClient({}, cfg);
    });

    it('listObjects ', async () => {
      nock(cfg.resourceServerUrl)
        .get('/')
        .reply(200, fs.readFileSync('spec/odata/samples/odataRootResponse.json'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.listObjects();
      expect(result).to.deep.equal({
        Advertisements: 'Advertisements',
        Categories: 'Categories',
        PersonDetails: 'PersonDetails',
        Persons: 'Persons',
        ProductDetails: 'ProductDetails',
        Products: 'Products',
        Suppliers: 'Suppliers',
      });
    });

    it('buildMetadataForEntityType', async () => {
      nock(cfg.resourceServerUrl)
        .get('/$metadata')
        .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.buildMetadataForEntityType('Categories');
      expect(result).to.deep.equal(JSON.parse(fs.readFileSync('spec/odata/samples/categoriesJsonSchema.json')));
    });

    it('fetchKeysForEntityType', async () => {
      cfg.objectType = 'Categories';
      nock(cfg.resourceServerUrl)
        .get('/$metadata')
        .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.fetchKeysForEntityType();
      expect(result).to.deep.equal([
        {
          name: 'ID',
          required: true,
          type: 'Edm.Int32',
          wrapValueInQuotesInUrls: false,
        },
      ]);
    });

    it('getMetaModelForLookupObjectByField with required false', async () => {
      cfg.objectType = 'Categories';
      cfg.fieldName = 'Name';

      nock(cfg.resourceServerUrl)
        .get('/$metadata')
        .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.getMetaModelForLookupObjectByField();
      expect(result.in).to.deep.equal({
        properties: {
          Name: {
            required: false,
            title: 'Name',
            type: 'string',
          },
        },
        type: 'object',
      });
    });

    it('getMetaModelForLookupObjectByField with required true', async () => {
      cfg.objectType = 'Categories';
      cfg.fieldName = 'Name';
      cfg.allowEmptyCriteria = false;

      nock(cfg.resourceServerUrl)
        .get('/$metadata')
        .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.getMetaModelForLookupObjectByField();
      expect(result.in).to.deep.equal({
        properties: {
          Name: {
            required: true,
            title: 'Name',
            type: 'string',
          },
        },
        type: 'object',
      });
    });

    it('getFieldsForObject ', async () => {
      nock(cfg.resourceServerUrl)
        .get('/$metadata')
        .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.getFieldsForObject('Categories');
      expect(result).to.deep.equal({
        ID: 'ID',
        Name: 'Name',
      });
    });

    it('getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject ', async () => {
      nock(cfg.resourceServerUrl)
        .get('/$metadata')
        .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

      const oDataClient = new ODataClient({}, cfg, restClient);
      const result = await oDataClient.getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject('Categories');
      expect(result).to.deep.equal(['Name']);
    });
  });
});
