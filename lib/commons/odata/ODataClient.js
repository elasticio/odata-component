'use strict';

const jsonSchemaGenerator = require('json-schema-generator');
const {messages} = require('elasticio-node');

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
    console.log(`OData Service Document: ${JSON.stringify(serviceDocument)}`);
    return serviceDocument.value
      .filter(definition => !definition.kind || definition.kind === 'EntitySet')
      .reduce((objectsSoFar, definition) => {
        objectsSoFar[definition.url] = definition.name;
        return objectsSoFar;
      }, {});
  }

  // TODO: Parse OData's CDSL language.  In the meantime, we will fetch a single existing object to build a JSONSchema
  async buildMetadataForEntityType (entityType) {
    const sampleDocument = await this.restClient.makeRequest({
      url: `${entityType}?$top=1`,
      method: 'GET'
    });
    const jsonSchemaDescription = jsonSchemaGenerator(sampleDocument.value[0]);
    delete jsonSchemaDescription.properties['@odata.etag'];
    const guessedKeyName = `${entityType.replace(/s$/, '')}id`;
    Object.keys(jsonSchemaDescription.properties).forEach(prop => {
      if (prop.charAt(0) === '_' || prop === guessedKeyName) { // Assume these are hidden
        delete jsonSchemaDescription.properties[prop];
      } else {
        const obj = jsonSchemaDescription.properties[prop];
        delete obj.minLength;
        if (!obj.type) {
          obj.type = 'string';
        }
      }
    });

    jsonSchemaDescription.properties.id = {
      type: 'string'
    };
    return {
      in: jsonSchemaDescription,
      out: jsonSchemaDescription
    };
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

  getMetaModelForLookupObjectByField() {
    const metadata = {
      in: {
        type: 'object',
        properties: {
          [this.cfg.fieldName]: {
            type: 'string',
            required: true,
            title: this.cfg.fieldName
          }
        }
      },
      out: {}
    };

    return metadata;
  }

  async getFieldsForObject(entityType) {
    const objectStructure = await this.buildMetadataForEntityType(entityType);
    return Object.keys(objectStructure.out.properties).reduce((soFar, prop) => {
      soFar[prop] = prop;
      return soFar;
    }, {});
  }

  async lookupObjectByField(msg) {
    const fieldValue = msg.body[this.cfg.fieldName];
    if (fieldValue === '') {
      if (this.cfg.allowEmptyCriteria) {
        this.emitter.emit(messages.newMessageWithBody({}));
        return;
      }

      throw new Error('Field Value is not provided for lookup where empty criteria are not allowed.');
    }

    const castFieldValue = this.cfg.castToString ? `'${fieldValue}'` : fieldValue;

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
  async upsertObjectById(msg) {
    const objectType = this.cfg.objectType;

    if (msg.body.id) {
      const id = msg.body.id;
      delete msg.body.id;
      console.log(`Will perform update to ${objectType} with id ${id}`);

      const updatedRecord = await this.restClient.makeRequest({
        url: `${objectType}(${id})`,
        method: 'PATCH',
        body: msg.body,
        headers: {Prefer: 'return=representation'}
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
        await client.upsertObjectById(msg);
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
        await client.lookupObjectByField(msg);
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
