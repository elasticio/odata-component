/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-unpublished-require */
'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const {expect} = chai;
const fs = require('fs');
const sinon = require('sinon');

const upsertObject = require('../lib/actions/upsertObject');
const lookupObject = require('../lib/actions/lookupObjectByFields');
const getObjectsPolling = require('../lib/triggers/getObjectsPolling');
const verifyCredentials = require('../verifyCredentials');

function randomString() {
  return  Math.random().toString(36).substring(2, 15);
}

describe('Integration Test', function () {
  let resourceServerUrl;
  let cfg;
  let emitter;

  this.timeout(30000);

  before(function () {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }

    resourceServerUrl = process.env.RESOURCE_SERVER_URL;
  });

  beforeEach(function () {
    cfg = {
      resourceServerUrl,
      auth: {
        type: 'No Auth'
      }
    };

    emitter = {
      emit: sinon.spy()
    };
  });

  describe('Trigger Tests', function () {
    it('GetObjectsPolling', async function () {
      cfg.objectType = 'People';

      const testCall = getObjectsPolling.process.call(emitter, {}, cfg);
      expect(testCall).to.be.rejectedWith(Error, 'No delta link provided.  Unable to record snapshot.');
      try{
        await testCall;
        // eslint-disable-next-line no-empty
      } catch (e) {}

      const emittedObjectsAfterCallOne = emitter.emit.withArgs('data').callCount;
      expect(emittedObjectsAfterCallOne).to.be.above(1);
    });
  });

  describe('List Objects Tests', function () {
    [upsertObject, getObjectsPolling, lookupObject].forEach(function (triggerOrAction) {
      it('List Objects', async function () {
        const result = await triggerOrAction.getObjects(cfg);
        const objects = Object.keys(result);
        expect(objects).to.include('People');
      });
    });
  });

  describe('Metadata Tests', function () {
    it('Build In Metadata', async function () {
      cfg.objectType = 'People';
      const metadata = await upsertObject.getMetaModel(cfg);

      expect(metadata.in).to.deep.equal(metadata.out);
      expect(metadata.in.type).to.equal('object');
      expect(metadata.in.required).to.be.true;

      const properties = metadata.in.properties;

      expect(properties.UserName).to.deep.include({
        type: 'string',
        required: true,
        title: 'UserName'
      });
      expect(properties.FirstName).to.deep.include({
        type: 'string',
        required: true,
        title: 'FirstName'
      });
      expect(properties.LastName).to.deep.include({
        type: 'string',
        required: false,
        title: 'LastName'
      });
      expect(properties.MiddleName).to.deep.include({
        type: 'string',
        required: false,
        title: 'MiddleName'
      });
      expect(properties.Gender).to.deep.include({
        type: 'string',
        required: true,
        enum: ['Male', 'Female', 'Unknow'],
        title: 'Gender'
      });
      expect(properties.Age).to.deep.include({
        type: 'number',
        required: false,
        title: 'Age'
      });
      expect(properties.Emails).to.deep.include({
        type: 'array',
        items: {
          type: 'string'
        },
        required: false,
        title: 'Emails'
      });
      expect(properties.AddressInfo).to.deep.include({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            Address: {
              type: 'string',
              required: true,
              title: 'Address'
            },
            City: {
              type: 'object',
              required: true,
              properties: {
                Name: {
                  type: 'string',
                  required: true,
                  title: 'Name'
                },
                CountryRegion: {
                  type: 'string',
                  required: true,
                  title: 'CountryRegion'
                },
                Region: {
                  type: 'string',
                  required: true,
                  title: 'Region'
                }
              }
            }
          }
        },
        required: false,
        title: 'AddressInfo'
      });

      expect(properties.HomeAddress).to.deep.include({
        type: 'object',
        properties: {
          Address: {
            type: 'string',
            required: true,
            title: 'Address'
          },
          City: {
            type: 'object',
            required: true,
            properties: {
              Name: {
                type: 'string',
                required: true,
                title: 'Name'
              },
              CountryRegion: {
                type: 'string',
                required: true,
                title: 'CountryRegion'
              },
              Region: {
                type: 'string',
                required: true,
                title: 'Region'
              }
            }
          }
        },
        required: false,
        title: 'HomeAddress'
      });

      expect(properties.FavoriteFeature).to.be.include({
        type: 'string',
        required: true,
        enum: ['Feature1', 'Feature2', 'Feature3', 'Feature4'],
        title: 'FavoriteFeature'
      });

      expect(properties.Features).to.be.include({
        type: 'array',
        required: true,
        items: {
          type: 'string',
          enum: ['Feature1', 'Feature2', 'Feature3', 'Feature4']
        },
        title: 'Features'
      });
    });
  });

  describe('Verify Credential Tests', function () {
    it('Success Case', async function () {
      const result = await verifyCredentials(cfg);
      expect(result).to.be.true;
    });
  });

  describe('Action Tests', function () {
    it('Upsert - Insert', async function () {
      cfg.objectType = 'People';
      const msg = {
        body: {
          FirstName: 'Jacob',
          MiddleName: 'One',
          LastName: 'Test',
          UserName: randomString()
        }
      };

      await upsertObject.process.call(emitter, msg, cfg, {});

      expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
      const result = emitter.emit.getCall(0).args[1];
      expect(result.body.UserName).to.not.be.null;
      expect(result.body.MiddleName).to.be.equal('One');
    });

    it('Upsert - Update', async function () {
      cfg.objectType = 'People';
      const newMiddleName =  randomString();
      const msg = {
        body: {
          FirstName: 'Scott',
          MiddleName: newMiddleName,
          LastName: 'Ketchum',
          UserName: 'scottketchum'
        }
      };
      await upsertObject.process.call(emitter, msg, cfg, {});

      expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
      const result = emitter.emit.getCall(0).args[1];
      expect(result.body.UserName).to.be.equal('scottketchum');
      expect(result.body.MiddleName).to.be.equal(newMiddleName);
    });

    describe('Lookup Object Tests', function () {
      it('Success Lookup String', async function () {
        cfg.objectType = 'People';
        cfg.fieldName = 'UserName';
        cfg.allowEmptyCriteria = true;
        cfg.castToString = true;

        const personUserName = process.env.CONTACT_TO_LOOKUP_ID;
        const expectedPersonFirstName = process.env.CONTACT_TO_LOOKUP_FIRST_NAME;

        const msg = {
          body: {
            UserName: personUserName
          }
        };

        await lookupObject.process.call(emitter, msg, cfg);

        expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
        const result = emitter.emit.getCall(0).args[1];
        expect(result.body.UserName).to.be.equal(personUserName);
        expect(result.body.FirstName).to.be.equal(expectedPersonFirstName);
      });
    });
  });
});
