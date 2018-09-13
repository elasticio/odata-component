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
  let username;
  let password;
  let cfg;
  let emitter;
  let objectType;
  let lookupFieldValue;
  let upsertKey;

  this.timeout(30000);

  before(function () {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }

    resourceServerUrl = process.env.BC_RESOURCE_SERVER_URL;
    username = process.env.BC_USERNAME;
    password = process.env.BC_WEB_SERVICE_ACCESS_KEY;
    objectType = process.env.BC_OBJECT_TYPE;
    lookupFieldValue = process.env.BC_TO_LOOKUP_FIELD_NAME;
    upsertKey = process.env.BC_PRIMARY_KEY;
  });

  beforeEach(function () {
    cfg = {
      resourceServerUrl,
      auth: {
        type: 'Basic Auth',
        basic: {
          username,
          password
        }
      }
    };

    emitter = {
      emit: sinon.spy()
    };
  });

  describe('Trigger Tests', function () {
    it('GetObjectsPolling', async function () {
      cfg.objectType = objectType;

      const testCall = getObjectsPolling.process.call(emitter, {}, cfg);
      expect(testCall).to.be.rejectedWith(Error);
      try{
        await testCall;
        // eslint-disable-next-line no-empty
      } catch (e) {}
    });
  });

  describe('List Objects Tests', function () {
    [upsertObject, getObjectsPolling, lookupObject].forEach(function (triggerOrAction) {
      it('List Objects', async function () {
        const result = await triggerOrAction.getObjects(cfg);
        const objects = Object.keys(result);
        expect(objects).to.include(objectType);
      });
    });
  });

  describe('Metadata Tests', function () {
    it('Build In Metadata', async function () {
      cfg.objectType = objectType;
      const metadata = await upsertObject.getMetaModel(cfg);

      expect(metadata.in).to.deep.equal(metadata.out);
      expect(metadata.in.type).to.equal('object');
      expect(metadata.in.required).to.be.true;

      const properties = metadata.in.properties;

      expect(properties[upsertKey].required).to.be.false;

      // A full set of assertions are in the unit tests
    });
  });

  describe('Verify Credential Tests', function () {
    it('Success Case', async function () {
      const result = await verifyCredentials(cfg);
      expect(result).to.be.true;
    });
  });

  describe('Action Tests', function () {
    it('Upsert - Insert, Update and Lookup', async function () {
      cfg.objectType = objectType;
      const insertFieldValue = `Automated Test ${randomString()}`;
      const insertMsg = {
        body: {
          [lookupFieldValue]: insertFieldValue
        }
      };

      await upsertObject.process.call(emitter, insertMsg, cfg, {});

      expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
      const insertResult = emitter.emit.withArgs('data').getCall(0).args[1];
      expect(insertResult.body[upsertKey]).to.be.a('string');
      expect(insertResult.body[upsertKey].length).to.be.above(0);
      expect(insertResult.body[lookupFieldValue]).to.be.equal(insertFieldValue);

      const providedKey = insertResult.body[upsertKey];

      const updateField = `${insertFieldValue} - Update`;
      const updateMsg = {
        body: {
          [lookupFieldValue]: updateField,
          [upsertKey]: providedKey
        }
      };
      emitter = {
        emit: sinon.spy()
      };

      await upsertObject.process.call(emitter, updateMsg, cfg, {});

      expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
      const upsertResult = emitter.emit.withArgs('data').getCall(0).args[1];
      expect(upsertResult.body[upsertKey]).to.be.equal(providedKey);
      expect(upsertResult.body[upsertKey].length).to.be.above(0);
      expect(upsertResult.body[lookupFieldValue]).to.be.equal(updateField);
    });

    describe('Lookup Object Tests', function () {
      it('Success Lookup String', async function () {
        cfg.objectType = objectType;
        cfg.fieldName = lookupFieldValue;
        cfg.allowEmptyCriteria = '1';

        const lookupValue = process.env.BC_TO_LOOKUP_FIELD_VALUE;
        const expectedId = process.env.BC_TO_LOOKUP_ID;

        const msg = {
          body: {
            [lookupFieldValue]: lookupValue
          }
        };

        await lookupObject.process.call(emitter, msg, cfg, {});

        expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
        const result = emitter.emit.withArgs('data').getCall(0).args[1];
        expect(result.body[lookupFieldValue]).to.be.equal(lookupValue);
        expect(result.body.No).to.be.equal(expectedId);
      });

      it('Lookup Empty Allowed', async function () {
        cfg.objectType = objectType;
        cfg.fieldName = lookupFieldValue;
        cfg.allowEmptyCriteria = '1';

        const msg = {
          body: {
            [lookupFieldValue]: ''
          }
        };

        await lookupObject.process.call(emitter, msg, cfg, {});

        expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
        const result = emitter.emit.withArgs('data').getCall(0).args[1];
        expect(result.body).to.deep.equal({});
      });

      it('Lookup Empty Not Allowed', async function () {
        cfg.objectType = objectType;
        cfg.fieldName = lookupFieldValue;
        cfg.allowEmptyCriteria = '0';

        const msg = {
          body: {
            [lookupFieldValue]: ''
          }
        };

        const testCall = lookupObject.process.call(emitter, msg, cfg, {});
        expect(testCall).to.be.rejectedWith(Error);
      });
    });
  });
});
