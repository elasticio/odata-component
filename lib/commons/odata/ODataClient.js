'use strict';

const {messages} = require('elasticio-node');
const {getJsonSchemaForEntitySet, getKeysForEntitySet, getMetadataForLookupId, extractFieldsToWrapInQuotes, getFieldsAndCsdlTypesForEntitySet} = require('./extractCsdl');

const maxPollingPageSize = 1000;

module.exports = class ODataClient {
  constructor(emitter, cfg, restClient) {
    this.emitter = emitter;
    this.cfg = cfg;
    this.restClient = restClient;
    this.cfg.odataVersion = this.cfg.odataVersion ? parseInt(this.cfg.odataVersion) : 4;
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

  async buildJsonSchemaForEntityType (entitySet) {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return await getJsonSchemaForEntitySet(csdlString, entitySet);
  }

  async fetchKeysForEntityType () {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return getKeysForEntitySet(csdlString, this.cfg.objectType);
  }

  async getFieldsForEntitySet() {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return await getFieldsAndCsdlTypesForEntitySet(csdlString, this.cfg.objectType);
  }

  async getTimestampFieldsForEntitySet() {
    const fieldTypes = await this.getFieldsForEntitySet();

    const timestamps = Object.entries(fieldTypes)
      // eslint-disable-next-line no-unused-vars
      .filter(([fieldName,csdlType]) => csdlType === 'Edm.DateTime' || csdlType === 'Edm.DateTimeOffset')
      // eslint-disable-next-line no-unused-vars
      .reduce((soFar, [fieldName,csdlType]) => {
        soFar[fieldName] = fieldName;
        return soFar;
      }, {});

    if(timestamps.length === 0) {
      throw new Error('No timestamps found for this object type.');
    }

    return timestamps;
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

  async getObjectsPollingByTimestamp(snapshot) {
    if(snapshot.version !== 1 || snapshot.objectType !== this.cfg.objectType || snapshot.operationType !== 'pollingByTimestamp' || snapshot.odataVersion !== this.cfg.odataVersion || snapshot.timestampField !== this.cfg.timestampField) {
      console.log('Detected change in config.');
      snapshot.odataVersion = this.cfg.odataVersion;
      snapshot.operationType = 'pollingByTimestamp';
      snapshot.objectType = this.cfg.objectType;
      snapshot.timestampField = this.cfg.timestampField;
      delete snapshot.castType;
      snapshot.version = 1;
    }

    if(this.cfg.odataVersion < 4 && ! snapshot.castType) {
      console.log('Need to look up cast type...');
      const fieldDefs = await this.getFieldsForEntitySet();
      snapshot.castType = fieldDefs[this.cfg.timestampField].replace('Edm.','');
    }

    const queryStringParameters = {
      $orderby: this.cfg.timestampField,
      $top: maxPollingPageSize
    };

    const sinceTime = snapshot.lastUpdateDateSeen || this.cfg.pollingStartTime || '';

    if(sinceTime) {
      if(this.cfg.odataVersion < 4) {
        queryStringParameters.$filter = `${this.cfg.timestampField} gt ${snapshot.castType}'${sinceTime}'`;
      } else {
        queryStringParameters.$filter = `${this.cfg.timestampField} gt ${snapshot.lastUpdateDateSeen}`;
      }
    }

    let hasMorePages = true;
    let lastUpdateDateSeen;
    snapshot.pageNumber = 0;
    do {
      console.log(`Fetching page ${snapshot.pageNumber} of results...`);
      queryStringParameters.$skip = snapshot.pageNumber * maxPollingPageSize;
      const queryStringParamsString = Object.entries(queryStringParameters).map(([k,v]) => `${k}=${v}`).join('&');
      const pollingResults = await this.restClient.makeRequest({
        url: `${this.cfg.objectType}?${queryStringParamsString}`,
        method: 'GET'
      });

      pollingResults.value.forEach(record => this.emitter.emit('data', messages.newMessageWithBody(record)));
      hasMorePages = pollingResults.value.length === maxPollingPageSize;
      if(pollingResults.value.length > 0) {
        lastUpdateDateSeen = pollingResults.value[pollingResults.value.length - 1][this.cfg.timestampField];
      }
      this.emitter.emit('snapshot', snapshot);
      snapshot.pageNumber++;
    } while (hasMorePages);

    console.log('All results fetched');
    delete snapshot.pageNumber;
    snapshot.lastUpdateDateSeen = lastUpdateDateSeen;
    this.emitter.emit('snapshot', snapshot);
  }

  async getMetaModelForLookupObjectByField() {
    const csdlString = await this.restClient.makeRequest({
      url: '/$metadata',
      method: 'GET',
      isJson: false
    });

    return await getMetadataForLookupId(csdlString, this.cfg.objectType, this.cfg.fieldName, this.cfg.allowEmptyCriteria == false);
  }

  async getMetaModelForLookupObjects() {
    const jsonSchemaForObject = await this.buildJsonSchemaForEntityType(this.cfg.objectType);

    return {
      in: {
        type: 'object',
        required: true,
        properties: {
          fieldName: {
            type: 'string',
            enum: Object.keys(jsonSchemaForObject.properties),
            required: true,
          },
          fieldValue: {
            type: 'object'
          }
        }
      },
      out: {
        type: 'object',
        required: true,
        properties: {
          values: {
            type: 'array',
            required: true,
          }
        }
      }
    };
  }

  async getFieldsForObject(entityType) {
    const objectStructure = await this.buildJsonSchemaForEntityType(entityType);
    return Object.keys(objectStructure.properties).reduce((soFar, prop) => {
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

  async lookupObjectByField(msg, snapshot) {
    if(snapshot.version !== 1 || this.cfg.fieldName !== snapshot.fieldName || this.cfg.objectType !== snapshot.objectType || snapshot.operationType !== 'lookupObject') {
      const fieldsThatNeedToBeWrappedInQuotesInUrlsForObject = await this.getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject(this.cfg.objectType);
      snapshot.fieldName = this.cfg.fieldName;
      snapshot.objectType = this.cfg.objectType;
      snapshot.operationType = 'lookupObject';
      snapshot.wrapFieldInQuotes = fieldsThatNeedToBeWrappedInQuotesInUrlsForObject.includes(this.cfg.fieldName);
      snapshot.version = 1;
      this.emitter.emit('snapshot', snapshot);
    }

    const fieldValue = msg.body[this.cfg.fieldName];
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      if (this.cfg.allowEmptyCriteria == true) {
        this.emitter.emit('data', messages.newMessageWithBody({}));
        return;
      }

      throw new Error('Field Value is not provided for lookup where empty criteria are not allowed.');
    }

    const castFieldValue = snapshot.wrapFieldInQuotes ? `'${fieldValue}'` : fieldValue;

    const results = await this.restClient.makeRequest({
      url: `${this.cfg.objectType}?$filter=${this.cfg.fieldName} eq ${castFieldValue}`,
      method: 'GET'
    });

    if (results.value.length !== 1) {
      throw new Error(`Failed to find a single ${this.cfg.objectType} corresponding to ${this.cfg.fieldName} === ${castFieldValue}.  Instead found ${results.value.length}.'`);
    }

    this.emitter.emit('data', messages.newMessageWithBody(results.value[0]));
  }

  async lookupObjects(msg, snapshot) {
    if(snapshot.version !== 1 || this.cfg.objectType !== snapshot.objectType || snapshot.operationType !== 'lookupObjects') {
      snapshot = {
        wrapFieldInQuoteInfo: {},
        objectType: this.cfg.objectType,
        operationType: 'lookupObject',
        version: 1
      };
    }

    const {fieldName, fieldValue} = msg.body;

    if(snapshot.wrapFieldInQuoteInfo[fieldName] === undefined) {
      const fieldsThatNeedToBeWrappedInQuotesInUrlsForObject = await this.getFieldsThatNeedToBeWrappedInQuotesInUrlsForObject(this.cfg.objectType);
      snapshot.wrapFieldInQuoteInfo[fieldName] = fieldsThatNeedToBeWrappedInQuotesInUrlsForObject.includes(fieldName);
      this.emitter.emit('snapshot', snapshot);
    }

    const castFieldValue = snapshot.wrapFieldInQuoteInfo[fieldName] ? `'${fieldValue}'` : fieldValue;

    const results = await this.restClient.makeRequest({
      url: `${this.cfg.objectType}?$filter=${fieldName} eq ${castFieldValue}`,
      method: 'GET'
    });

    this.emitter.emit('data', messages.newMessageWithBody({values: results.value}));
  }

  // eslint-disable-next-line no-unused-vars
  async upsertObjectById(msg, snapshot) {
    const objectType = this.cfg.objectType;

    if(snapshot.version !== 1 || snapshot.objectType !== objectType || snapshot.operationType !== 'upsert') {
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
      const ids = snapshot.keys.map(key => {
        const keyValue = msg.body[key.name];
        return key.wrapValueInQuotesInUrls ? `'${keyValue}'` : keyValue;
      });
      const idString = ids.join(',');
      snapshot.keys.forEach(key => delete msg.body[key.name]);

      console.log(`Will perform update to ${objectType} with id ${idString}`);

      let updatedRecord = await this.restClient.makeRequest({
        url: `${objectType}(${idString})`,
        method: 'PATCH',
        body: msg.body,
        headers: {
          Prefer: 'return=representation',
          'If-Match': '*'
        }
      });
      // Sometimes the return=representation preference is ignored and a 204 is returned.
      // In that case we need to do a get
      if(!updatedRecord) {
        updatedRecord = await this.restClient.makeRequest({
          url: `${objectType}(${idString})`,
          method: 'GET',
        });
      }
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
      const jsonSchemaForType = await client.buildJsonSchemaForEntityType(cfg.objectType);
      return {
        in: jsonSchemaForType,
        out: jsonSchemaForType
      }
    };
  }

  static _getFieldsForObjectFactory(oDataClientClass) {
    return async function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.getFieldsForObject(cfg.objectType);
    };
  }

  static _getTimestampFields(oDataClientClass) {
    return async function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.getTimestampFieldsForEntitySet();
    }
  }

  static _getMetaModelForLookupObjectByFieldFactory(oDataClientClass) {
    return function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.getMetaModelForLookupObjectByField();
    };
  }

  static _getMetaModelForLookupObjects(oDataClientClass) {
    return function (cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.getMetaModelForLookupObjects();
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

  static getObjectsPollingByTimestampFactory(oDataClientClass) {
    return {
      process: async function (msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.getObjectsPollingByTimestamp(snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getTimestampFields: this._getTimestampFields(oDataClientClass)
    };
  }

  static upsertObjectByIdFactory(oDataClientClass) {
    return {
      // eslint-disable-next-line no-unused-vars
      process: async function (msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.upsertObjectById(msg, snapshot);
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
        await client.lookupObjectByField(msg, snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getFieldsForObject: this._getFieldsForObjectFactory(oDataClientClass),
      getMetaModel: this._getMetaModelForLookupObjectByFieldFactory(oDataClientClass)
    };
  }

  static lookupObjectsFactory(oDataClientClass) {
    return {
      // eslint-disable-next-line no-unused-vars
      process: async function (msg, cfg, snapshot = {}) {
        const client = oDataClientClass.create(this, cfg);
        await client.lookupObjects(msg, snapshot);
      },
      getObjects: this._getListOfObjectsFactory(oDataClientClass),
      getMetaModel: this._getMetaModelForLookupObjects(oDataClientClass)
    };
  }

  static verifyCredentialsFactory(oDataClientClass) {
    return async function(cfg) {
      const client = oDataClientClass.create(this, cfg);
      return client.verifyCredentials();
    }
  }
};
