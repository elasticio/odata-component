'use strict';

const {messages} = require('elasticio-node');
const {getJsonSchemaForEntitySet, getKeysForEntitySet, getMetadataForLookupId, extractFieldsToWrapInQuotes} = require('./extractCsdl');

module.exports = class ODataClient {
  constructor(emitter, cfg, restClient) {
    this.emitter = emitter;
    this.cfg = cfg;
    this.restClient = restClient;
  }

  async listObjects () {
    const serviceDocument = await this.restClient.makeRequest({
      url: '',
      method:'GET'
    });
    return serviceDocument.value
      .filter(definition => !definition.kind || definition.kind === 'EntitySet')
      .reduce((objectsSoFar, definition) => {
        objectsSoFar[definition.url] = definition.name;
        return objectsSoFar;
      }, {});
  }

  async buildMetadataForEntityType (entitySet) {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    const jsonSchemaForEntitySet = await getJsonSchemaForEntitySet(csdlString, entitySet);

    return {
      in: jsonSchemaForEntitySet,
      out: jsonSchemaForEntitySet
    };
  }

  async fetchKeysForEntityType () {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return getKeysForEntitySet(csdlString, this.cfg.objectType);
  }

  async getObjectsPolling(snapshot) {
    if (snapshot.deltaLink) {
      // Follow Delta link
      console.log(`Current delta link: ${snapshot.deltaLink}`);
      const linkResults = await this.restClient.makeRequest({
        url: snapshot.deltaLink,
        method: 'GET',
        urlIsSegment: false
      });
      linkResults.value.forEach(record => this.emitter.emit('data', messages.newMessageWithBody(record)));
      this.emitter.emit('snapshot', {deltaLink: linkResults['@odata.deltaLink']});
      console.log(`Next delta link: ${linkResults['@odata.deltaLink']}`);
    } else {
      console.log(`No delta link detected.  Requesting one...`);
      const linkResults = await this.restClient.makeRequest({
        url: this.cfg.objectType,
        method: 'GET',
        headers: {Prefer: 'odata.track-changes'}
      });
      linkResults.value.forEach(record => this.emitter.emit('data', messages.newMessageWithBody(record)));

      const deltaLink = linkResults['@odata.deltaLink'];
      if (!deltaLink) {
        throw new Error(`No delta link provided.  Unable to record snapshot.`);
      }

      this.emitter.emit('snapshot', {deltaLink});
      console.log(`Next delta link: ${linkResults['@odata.deltaLink']}`);
    }
  }

  async getMetaModelForLookupObjectByField() {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return await getMetadataForLookupId(csdlString, this.cfg.objectType, this.cfg.fieldName);
  }

  async getFieldsForObject(entityType) {
    const objectStructure = await this.buildMetadataForEntityType(entityType);
    return Object.keys(objectStructure.out.properties).reduce((soFar, prop) => {
      soFar[prop] = prop;
      return soFar;
    }, {});
  }

  async getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject(entityType) {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return extractFieldsToWrapInQuotes(csdlString, entityType);
  }

  async lookupObjectByField(msg, fieldsThatNeedToBeWrappedInQuotesInUrlsForObject) {
    const fieldValue = msg.body[this.cfg.fieldName];
    if (fieldValue === '') {
      if (this.cfg.allowEmptyCriteria) {
        this.emitter.emit(messages.newMessageWithBody({}));
        return;
      }

      throw new Error('Field Value is not provided for lookup where empty criteria are not allowed.');
    }

    const wrapFieldInQuotes = fieldsThatNeedToBeWrappedInQuotesInUrlsForObject.includes(this.cfg.fieldName);
    const castFieldValue = wrapFieldInQuotes ? `'${fieldValue}'` : fieldValue;

    const results = await this.restClient.makeRequest({
      url: `${this.cfg.objectType}?$filter=${this.cfg.fieldName} eq ${castFieldValue}`,
      method: 'GET'
    });

    if (results.value.length !== 1) {
      throw new Error(`Failed to find a single ${this.cfg.objectType} corresponding to ${this.cfg.fieldName} === ${castFieldValue}.  Instead found ${results.value.length}.'`);
    }

    this.emitter.emit('data', messages.newMessageWithBody(results.value[0]));
  }

  // eslint-disable-next-line no-unused-vars
  async upsertObjectById(msg, keys) {
    const objectType = this.cfg.objectType;

    const allKeysProvided = keys.every(key => msg.body[key.name]);
    const allKeysOmitted = keys.every(key => !msg.body[key.name]);

    if (!allKeysOmitted && !allKeysProvided) {
      throw new Error('Unclear if insert or update operation since only some object keys were provided');
    }

    if (allKeysProvided) {
      const ids = keys.map(key => {
        const keyValue = msg.body[key.name];
        return key.wrapValueInQuotesInUrls ? `'${keyValue}'` : keyValue;
      });
      const idString = ids.join(',');
      keys.forEach(key => delete msg.body[key.name]);

      console.log(`Will perform update to ${objectType} with id ${idString}`);

      const updatedRecord = await this.restClient.makeRequest({
        url: `${objectType}(${idString})`,
        method: 'PATCH',
        body: msg.body,
        headers: {
          Prefer: 'return=representation',
          'If-Match': '*'
        }
      });
      updatedRecord.isNew = false;
      this.emitter.emit('data', messages.newMessageWithBody(updatedRecord));
      return;
    }
    console.log(`Will create a(n) ${objectType}`);
    const createdRecord = await this.restClient.makeRequest({
      url: objectType,
      method: 'POST',
      body: msg.body,
      headers:{Prefer: 'return=representation'}
    });
    createdRecord.isNew = true;
    this.emitter.emit('data', messages.newMessageWithBody(createdRecord));
  }

  async verifyCredentials() {
    try {
      // Fetch service document
      await this.restClient.makeRequest({
        url: '',
        method: 'GET'
      });
      console.log('Successfully verified credentials.');
      return true;
    } catch (e) {
      // Workaround for https://github.com/elasticio/sailor-nodejs/issues/58
      console.log(`Exception: ${e.toString()} \n ${e.stack}`);
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
      process: async function (msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.getObjectsPolling(snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass)
    };
  }

  static upsertObjectByIdFactory(oDataClientClass) {
    return {
      // eslint-disable-next-line no-unused-vars
      process: async function (msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        if(snapshot.version !== 1) {
          snapshot.keys = await client.fetchKeysForEntityType();
          snapshot.version = 1;
          this.emit('snapshot', snapshot);
        }
        await client.upsertObjectById(msg, snapshot.keys);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getMetaModel: this._getMetadataForEntityTypeFactory(oDataClientClass)
    };
  }

  static lookupObjectByFieldFactory(oDataClientClass) {
    return {
      // eslint-disable-next-line no-unused-vars
      process: async function (msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        if(snapshot.version !== 1) {
          snapshot.fieldsThatNeedToBeWrappedInQuotesInUrlsForObject = await client.getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject(cfg.objectType);
          snapshot.version = 1;
          this.emit('snapshot', snapshot);
        }
        await client.lookupObjectByField(msg, snapshot.fieldsThatNeedToBeWrappedInQuotesInUrlsForObject);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getFieldsForObject: this._getFieldsForObjectFactory(oDataClientClass),
      getMetaModel: this._getMetaModelForLookupObjectByFieldFactory(oDataClientClass)
    };
  }

  static verifyCredentialsFactory(oDataClientClass) {
    return async function(cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.verifyCredentials();
    }
  }
};
