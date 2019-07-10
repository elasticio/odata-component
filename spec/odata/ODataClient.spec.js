const { expect } = require('chai');
const fs = require('fs');
const nock = require('nock');
const sinon = require('sinon');

const { NoAuthRestClient } = require('@elastic.io/odata-library');

const ODataClient = require('../../lib/commons/odata/ODataClient');

describe('OData Client Test Cases ', () => {
  describe('api requests ', () => {
    let emitter;
    let cfg;
    let restClient;

    beforeEach(() => {
      emitter = {
        emit: sinon.spy(),
      };

      cfg = {
        auth: { type: 'No Auth' },
        resourceServerUrl: 'http://example.com',
      };

      restClient = new NoAuthRestClient({}, cfg);
    });

    describe('getObjectsPolling ', () => {
      it('getObjectsPolling no snapshot ', async () => {
        const response = JSON.parse(fs.readFileSync('spec/odata/samples/categoriesOnGetResponse.json'));
        response['@odata.deltaLink'] = 'http://example.com/deltalink';

        cfg.objectType = 'Categories';
        nock(cfg.resourceServerUrl)
          .get('/Categories')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.getObjectsPolling({});

        expect(emitter.emit.getCalls().length).to.equal(4);
        expect(emitter.emit.getCalls().filter(call => call.args[0] === 'data').length).to.equal(3);

        expect(emitter.emit.getCall(0).args[1].body).to.deep.equal(response.value[0]);

        expect(emitter.emit.getCall(3).args).to.deep.equal([
          'snapshot',
          {
            deltaLink: response['@odata.deltaLink'],
          },
        ]);
      });

      it('getObjectsPolling with snapshot ', async () => {
        const response = JSON.parse(fs.readFileSync('spec/odata/samples/categoriesOnGetResponse.json'));
        const deltaLink = 'http://example.com/deltalink';
        response['@odata.deltaLink'] = 'http://example.com/deltalink/new';

        cfg.objectType = 'Categories';
        nock('http://example.com')
          .get('/deltalink')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.getObjectsPolling({ deltaLink });

        expect(emitter.emit.getCalls().length).to.equal(4);
        expect(emitter.emit.getCalls().filter(call => call.args[0] === 'data').length).to.equal(3);

        expect(emitter.emit.getCall(0).args[1].body).to.deep.equal(response.value[0]);

        expect(emitter.emit.getCall(3).args).to.deep.equal([
          'snapshot',
          {
            deltaLink: response['@odata.deltaLink'],
          },
        ]);
      });
    });

    describe('lookupObjectByField ', () => {
      it('no snapshot with string type ', async () => {
        cfg.objectType = 'Categories';
        cfg.fieldName = 'Name';

        const msg = { body: { Name: 'Beverages' } };
        const response = { value: [{ ID: 1, Name: msg.body.Name }] };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .get('/Categories?$filter=Name%20eq%20%27Beverages%27')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.lookupObjectByField(msg, {});

        const expectedSnapshot = {
          version: 1,
          objectType: 'Categories',
          fieldName: 'Name',
          operationType: 'lookupObject',
          wrapFieldInQuotes: true,
        };

        expect(emitter.emit.getCall(0).args[0]).to.equal('snapshot');
        expect(emitter.emit.getCall(0).args[1]).to.deep.equal(expectedSnapshot);

        expect(emitter.emit.getCall(1).args[0]).to.equal('data');
        expect(emitter.emit.getCall(1).args[1].body).to.deep.equal(response.value[0]);
      });

      it('no snapshot with numeric type ', async () => {
        cfg.objectType = 'Categories';
        cfg.fieldName = 'ID';

        const msg = { body: { ID: 1 } };
        const response = { value: [{ ID: msg.body.ID, Name: 'Some Name' }] };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .get('/Categories?$filter=ID%20eq%201')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.lookupObjectByField(msg, {});

        const expectedSnapshot = {
          version: 1,
          objectType: 'Categories',
          fieldName: 'ID',
          operationType: 'lookupObject',
          wrapFieldInQuotes: false,
        };

        expect(emitter.emit.getCall(0).args[0]).to.equal('snapshot');
        expect(emitter.emit.getCall(0).args[1]).to.deep.equal(expectedSnapshot);

        expect(emitter.emit.getCall(1).args[0]).to.equal('data');
        expect(emitter.emit.getCall(1).args[1].body).to.deep.equal(response.value[0]);
      });

      it('no snapshot with boolean type ', async () => {
        cfg.objectType = 'PersonDetails';
        cfg.fieldName = 'Gender';

        const msg = { body: { Gender: true } };
        const response = { value: [{ PersonID: 1, Age: 21, Gender: true }] };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .get('/PersonDetails?$filter=Gender%20eq%20%27true%27')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.lookupObjectByField(msg, {});

        const expectedSnapshot = {
          version: 1,
          objectType: 'PersonDetails',
          fieldName: 'Gender',
          operationType: 'lookupObject',
          wrapFieldInQuotes: true,
        };

        expect(emitter.emit.getCall(0).args[0]).to.equal('snapshot');
        expect(emitter.emit.getCall(0).args[1]).to.deep.equal(expectedSnapshot);

        expect(emitter.emit.getCall(1).args[0]).to.equal('data');
        expect(emitter.emit.getCall(1).args[1].body).to.deep.equal(response.value[0]);
      });

      it('no snapshot with empty response', async () => {
        cfg.objectType = 'PersonDetails';
        cfg.fieldName = 'Gender';

        const msg = { body: { Gender: true } };
        const response = {
          value: [],
        };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .get('/PersonDetails?$filter=Gender%20eq%20%27true%27')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);

        try {
          await oDataClient.lookupObjectByField(msg, {});
        } catch (err) {
          expect(err.toString()).to.equal('Error: Failed to find a single PersonDetails'
            + ' corresponding to Gender === \'true\'.  Instead found 0.\'');
        }
      });

      it('no snapshot with multiple response data', async () => {
        cfg.objectType = 'PersonDetails';
        cfg.fieldName = 'Gender';

        const msg = { body: { Gender: true } };
        const response = {
          value: [
            { PersonID: 1, Age: 21, Gender: true },
            { PersonID: 2, Age: 32, Gender: true },
          ],
        };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .get('/PersonDetails?$filter=Gender%20eq%20%27true%27')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);

        try {
          await oDataClient.lookupObjectByField(msg, {});
        } catch (err) {
          expect(err.toString()).to.equal('Error: Failed to find a single PersonDetails'
            + ' corresponding to Gender === \'true\'.  Instead found 2.\'');
        }
      });

      it('with snapshot', async () => {
        cfg.objectType = 'PersonDetails';
        cfg.fieldName = 'Gender';

        const msg = { body: { Gender: true } };

        const snapshot = {
          version: 1,
          objectType: 'PersonDetails',
          fieldName: 'Gender',
          operationType: 'lookupObject',
          wrapFieldInQuotes: true,
        };

        const response = {
          value: [
            { PersonID: 1, Age: 21, Gender: true },
          ],
        };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .get('/PersonDetails?$filter=Gender%20eq%20%27true%27')
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);

        await oDataClient.lookupObjectByField(msg, snapshot);

        expect(emitter.emit.getCall(0).args[0]).to.equal('data');
        expect(emitter.emit.getCall(0).args[1].body).to.deep.equal(response.value[0]);
      });
    });

    describe('upsertObjectById ', () => {
      it('no snapshot with string type  no PID ', async () => {
        cfg.objectType = 'Categories';
        const msg = { body: { ID: 1, Name: 'BBeverages' } };
        const response = { result: 'OK' };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .patch('/Categories(1)', { Name: msg.body.Name })
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.upsertObjectById(msg, {});

        const expectedSnapshot = {
          keys: [
            {
              required: true,
              name: 'ID',
              wrapValueInQuotesInUrls: false,
              type: 'Edm.Int32',
            },
          ],
          operationType: 'upsert',
          objectType: 'Categories',
          version: 1,
        };

        expect(emitter.emit.getCall(0).args[0]).to.equal('snapshot');
        expect(emitter.emit.getCall(0).args[1]).to.deep.equal(expectedSnapshot);

        const expectedBody = JSON.parse(JSON.stringify(response));
        expectedBody.isNew = false;
        expect(emitter.emit.getCall(1).args[0]).to.equal('data');
        expect(emitter.emit.getCall(1).args[1].body).to.deep.equal(expectedBody);
      });

      it('with snapshot with string type no PID ', async () => {
        cfg.objectType = 'Categories';
        const msg = { body: { ID: 1, Name: 'BBeverages' } };
        const response = { result: 'OK' };

        const snapshot = {
          keys: [
            {
              required: true,
              name: 'ID',
              wrapValueInQuotesInUrls: false,
              type: 'Edm.Int32',
            },
          ],
          operationType: 'upsert',
          objectType: 'Categories',
          version: 1,
        };

        nock(cfg.resourceServerUrl)
          .get('/$metadata')
          .reply(200, fs.readFileSync('spec/odata/samples/odataMetadataResponse.xml'));

        nock('http://example.com')
          .patch('/Categories(1)', { Name: msg.body.Name })
          .reply(200, response);

        const oDataClient = new ODataClient(emitter, cfg, restClient);
        await oDataClient.upsertObjectById(msg, snapshot);

        const expectedBody = JSON.parse(JSON.stringify(response));
        expectedBody.isNew = false;
        expect(emitter.emit.getCall(0).args[0]).to.equal('data');
        expect(emitter.emit.getCall(0).args[1].body).to.deep.equal(expectedBody);
      });
    });
  });

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
      expect(result).to.deep
        .equal(JSON.parse(fs.readFileSync('spec/odata/samples/categoriesJsonSchema.json')));
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
      const result = await oDataClient
        .getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject('Categories');
      expect(result).to.deep.equal(['Name']);
    });
  });
});
