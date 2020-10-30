/* eslint-disable no-param-reassign,no-underscore-dangle,func-names */
const { messages } = require('elasticio-node');
const odataLibrary = require('@elastic.io/odata-library');
const {
  getJsonSchemaForEntitySet,
  getKeysForEntitySet,
  getMetadataForLookupId,
  extractFieldsToWrapInQuotes,
} = require('./extractCsdl');

module.exports = class ODataClient {
  constructor(emitter, cfg, restClient) {
    this.emitter = emitter;
    this.cfg = cfg;
    this.restClient = restClient;
    this.odataClient = new odataLibrary.ODataClient(cfg, restClient);
    this.logger = emitter.logger;
  }

  async listObjects() {
    const serviceDocument = await this.restClient.makeRequest({
      url: '',
      method: 'GET',
    });
    return serviceDocument.value
      .filter(definition => !definition.kind || definition.kind === 'EntitySet')
      .reduce((objectsSoFar, definition) => {
        objectsSoFar[definition.url] = definition.name;
        return objectsSoFar;
      }, {});
  }

  async buildMetadataForEntityType(entitySet) {
    const csdlString = await this.odataClient.getMetadata();
    const jsonSchemaForEntitySet = await getJsonSchemaForEntitySet(csdlString, entitySet);

    return {
      in: jsonSchemaForEntitySet,
      out: jsonSchemaForEntitySet,
    };
  }

  async fetchKeysForEntityType() {
    const csdlString = await this.odataClient.getMetadata();
    return getKeysForEntitySet(csdlString, this.cfg.objectType);
  }

  async getObjectsPolling(snapshot) {
    // eslint-disable-next-line max-len
    const linkResults = await this.odataClient.getObjectsPollingByDeltaLink(snapshot, this.cfg.objectType);

    linkResults.value.forEach(record => this.emitter.emit('data',
      messages.newMessageWithBody(record)));

    const deltaLink = linkResults['@odata.deltaLink'];
    if (!deltaLink) {
      throw new Error('No delta link provided.  Unable to record snapshot.');
    }

    this.emitter.emit('snapshot', { deltaLink });
    this.logger.info('Next delta link found');
  }

  async getMetaModelForLookupObjectByField() {
    const csdlString = await this.odataClient.getMetadata();
    return getMetadataForLookupId(csdlString, this.cfg.objectType,
      this.cfg.fieldName, this.cfg.allowEmptyCriteria === false);
  }

  async getFieldsForObject(entityType) {
    const objectStructure = await this.buildMetadataForEntityType(entityType);
    return Object.keys(objectStructure.out.properties).reduce((soFar, prop) => {
      soFar[prop] = prop;
      return soFar;
    }, {});
  }

  async getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject(entityType) {
    const csdlString = await this.odataClient.getMetadata();
    return extractFieldsToWrapInQuotes(csdlString, entityType);
  }

  async lookupObjectByField(msg, snapshot) {
    if (snapshot.version !== 1 || this.cfg.fieldName !== snapshot.fieldName
      || this.cfg.objectType !== snapshot.objectType || snapshot.operationType !== 'lookupObject') {
      const fieldsThatNeedToBeWrappedInQuotesInUrlsForObject = await this
        .getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject(this.cfg.objectType);
      snapshot.fieldName = this.cfg.fieldName;
      snapshot.objectType = this.cfg.objectType;
      snapshot.operationType = 'lookupObject';
      snapshot.wrapFieldInQuotes = fieldsThatNeedToBeWrappedInQuotesInUrlsForObject
        .includes(this.cfg.fieldName);
      snapshot.version = 1;
      this.emitter.emit('snapshot', snapshot);
    }

    const fieldValue = msg.body[this.cfg.fieldName];
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      if (this.cfg.allowEmptyCriteria === true) {
        this.emitter.emit('data', messages.newMessageWithBody({}));
        return;
      }

      throw new Error('Field Value is not provided for lookup where empty criteria are not allowed.');
    }

    const castFieldValue = snapshot.wrapFieldInQuotes ? `'${fieldValue}'` : fieldValue;

    const results = await this.restClient.makeRequest({
      url: `${this.cfg.objectType}?$filter=${this.cfg.fieldName} eq ${castFieldValue}`,
      method: 'GET',
    });

    if (results.value.length !== 1) {
      throw new Error(`Failed to find a single ${this.cfg.objectType} corresponding to `
        + `${this.cfg.fieldName} === ${castFieldValue}.  Instead found ${results.value.length}.'`);
    }

    this.emitter.emit('data', messages.newMessageWithBody(results.value[0]));
  }

  // eslint-disable-next-line no-unused-vars
  async upsertObjectById(msg, snapshot) {
    const { objectType } = this.cfg;

    if (snapshot.version !== 1 || snapshot.objectType !== objectType
      || snapshot.operationType !== 'upsert') {
      snapshot.keys = await this.fetchKeysForEntityType();
      snapshot.operationType = 'upsert';
      snapshot.objectType = objectType;
      snapshot.version = 1;
      this.emitter.emit('snapshot', snapshot);
    }

    const allKeysProvided = snapshot.keys.every(key => msg.body[key.name]);
    const allKeysOmitted = snapshot.keys.every(key => !msg.body[key.name]);

    if (!allKeysOmitted && !allKeysProvided) {
      throw new Error('Unclear if insert or update operation since only some object keys were provided');
    }

    if (allKeysProvided) {
      const ids = snapshot.keys.map((key) => {
        const keyValue = msg.body[key.name];
        return key.wrapValueInQuotesInUrls ? `'${keyValue}'` : keyValue;
      });
      const idString = ids.join(',');
      snapshot.keys.forEach(key => delete msg.body[key.name]);

      this.logger.info(`Will perform update to ${objectType}`);

      let updatedRecord = await this.restClient.makeRequest({
        url: `${objectType}(${idString})`,
        method: 'PATCH',
        body: msg.body,
        headers: {
          Prefer: 'return=representation',
          'If-Match': '*',
        },
      });
      // Sometimes the return=representation preference is ignored and a 204 is returned.
      // In that case we need to do a get
      if (!updatedRecord) {
        updatedRecord = await this.restClient.makeRequest({
          url: `${objectType}(${idString})`,
          method: 'GET',
        });
      }
      updatedRecord.isNew = false;
      this.emitter.emit('data', messages.newMessageWithBody(updatedRecord));
      return;
    }
    this.logger.info(`Will create a(n) ${objectType}`);
    const createdRecord = await this.restClient.makeRequest({
      url: objectType,
      method: 'POST',
      body: msg.body,
      headers: { Prefer: 'return=representation' },
    });
    createdRecord.isNew = true;
    this.emitter.emit('data', messages.newMessageWithBody(createdRecord));
  }

  async verifyCredentials() {
    try {
      // Fetch service document
      await this.restClient.makeRequest({
        url: '',
        method: 'GET',
      });
      this.logger.info('Successfully verified credentials.');
      return true;
    } catch (e) {
      // Workaround for https://github.com/elasticio/sailor-nodejs/issues/58
      this.logger.info('Credentials verification failed!');
      return false;
    }
  }

  static _getListOfObjectsFactory(oDataClientClass) {
    return async function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.listObjects();
    };
  }

  static _getMetadataForEntityTypeFactory(oDataClientClass) {
    return async function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.buildMetadataForEntityType(cfg.objectType);
    };
  }

  static _getFieldsForObjectFactory(oDataClientClass) {
    return async function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.getFieldsForObject(cfg.objectType);
    };
  }

  static _getMetaModelForLookupObjectByFieldFactory(oDataClientClass) {
    return function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.getMetaModelForLookupObjectByField();
    };
  }

  static getObjectsPollingFactory(oDataClientClass) {
    return {
      async process(msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.getObjectsPolling(snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
    };
  }

  static upsertObjectByIdFactory(oDataClientClass) {
    return {
      // eslint-disable-next-line no-unused-vars
      async process(msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.upsertObjectById(msg, snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getMetaModel: this._getMetadataForEntityTypeFactory(oDataClientClass),
    };
  }

  static lookupObjectByFieldFactory(oDataClientClass) {
    return {
      // eslint-disable-next-line no-unused-vars
      async process(msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.lookupObjectByField(msg, snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getFieldsForObject: this._getFieldsForObjectFactory(oDataClientClass),
      getMetaModel: this._getMetaModelForLookupObjectByFieldFactory(oDataClientClass),
    };
  }

  static verifyCredentialsFactory(oDataClientClass) {
    return async function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.verifyCredentials();
    };
  }
};
