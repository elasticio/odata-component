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
const lookupObjects = require('../lib/actions/lookupObjects');
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
  let lookupFieldName;
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
    lookupFieldName = process.env.BC_TO_LOOKUP_FIELD_NAME;
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

    it('Lookup Object Metadata', async function() {
      cfg.objectType = objectType;
      cfg.fieldName = lookupFieldName;
      cfg.allowEmptyCriteria = '0';

      const noEmptyMetadata = await lookupObject.getMetaModel(cfg);
      expect(noEmptyMetadata.in.properties[lookupFieldName].required).to.be.true;

      cfg.allowEmptyCriteria = '1';
      const allowEmptyMetadata = await lookupObject.getMetaModel(cfg);
      expect(allowEmptyMetadata.in.properties[lookupFieldName].required).to.be.false;
    });

    it('Lookup Objects Metadata', async function () {
      cfg.objectType = objectType;
      const metadata = await lookupObjects.getMetaModel(cfg);

      expect(metadata.in.properties.fieldName.enum).to.contain.all.members([upsertKey, lookupFieldName]);
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
          [lookupFieldName]: insertFieldValue
        }
      };

      await upsertObject.process.call(emitter, insertMsg, cfg, {});

      expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
      const insertResult = emitter.emit.withArgs('data').getCall(0).args[1];
      expect(insertResult.body[upsertKey]).to.be.a('string');
      expect(insertResult.body[upsertKey].length).to.be.above(0);
      expect(insertResult.body[lookupFieldName]).to.be.equal(insertFieldValue);

      const providedKey = insertResult.body[upsertKey];

      const updateField = `${insertFieldValue} - Update`;
      const updateMsg = {
        body: {
          [lookupFieldName]: updateField,
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
      expect(upsertResult.body[lookupFieldName]).to.be.equal(updateField);
    });

    describe('Lookup Object Tests', function () {
      it('Success Lookup String', async function () {
        cfg.objectType = objectType;
        cfg.fieldName = lookupFieldName;
        cfg.allowEmptyCriteria = '1';

        const lookupValue = process.env.BC_TO_LOOKUP_FIELD_VALUE;
        const expectedId = process.env.BC_TO_LOOKUP_ID;

        const msg = {
          body: {
            [lookupFieldName]: lookupValue
          }
        };

        await lookupObject.process.call(emitter, msg, cfg, {});

        expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
        const result = emitter.emit.withArgs('data').getCall(0).args[1];
        expect(result.body[lookupFieldName]).to.be.equal(lookupValue);
        expect(result.body.No).to.be.equal(expectedId);
      });

      it('Lookup Empty Allowed', async function () {
        cfg.objectType = objectType;
        cfg.fieldName = lookupFieldName;
        cfg.allowEmptyCriteria = '1';

        const msg = {
          body: {
            [lookupFieldName]: ''
          }
        };

        await lookupObject.process.call(emitter, msg, cfg, {});

        expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
        const result = emitter.emit.withArgs('data').getCall(0).args[1];
        expect(result.body).to.deep.equal({});
      });

      it('Lookup Empty Not Allowed', async function () {
        cfg.objectType = objectType;
        cfg.fieldName = lookupFieldName;
        cfg.allowEmptyCriteria = '0';

        const msg = {
          body: {
            [lookupFieldName]: ''
          }
        };

        const testCall = lookupObject.process.call(emitter, msg, cfg, {});
        expect(testCall).to.be.rejectedWith(Error);
      });

      describe('Lookup Objects Tests', function() {
        it('Lookup Double', async function() {
          cfg.objectType = objectType;

          const msg = {
            body: {
              fieldName: lookupFieldName,
              fieldValue: process.env.BC_TO_LOOKUP_OBJECTS_DOUBLE_VALUE
            }
          };

          await lookupObjects.process.call(emitter, msg, cfg, {});

          expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
          const result = emitter.emit.withArgs('data').getCall(0).args[1];
          expect(result.body.values.length).to.be.equal(2);
        });

        it('Lookup Zero', async function() {
          cfg.objectType = objectType;

          const msg = {
            body: {
              fieldName: lookupFieldName,
              fieldValue: process.env.BC_TO_LOOKUP_OBJECTS_NONE_VALUE
            }
          };

          await lookupObjects.process.call(emitter, msg, cfg, {});

          expect(emitter.emit.withArgs('data').callCount).to.be.equal(1);
          const result = emitter.emit.withArgs('data').getCall(0).args[1];
          expect(result.body.values.length).to.be.equal(0);
        });
      })
    });
  });
});
