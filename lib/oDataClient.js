'use strict';

const RestClient = require('./restClient');

module.exports = class ODataClient extends RestClient {
  constructor(emitter, cfg) {
    super(emitter, cfg);

    this.listObjects = async function () {
      const serviceDocument = await this.makeRequest('', 'GET');
      console.log(`OData Service Document: ${JSON.stringify(serviceDocument)}`);
      return serviceDocument.value
        .filter(definition => !definition.kind || definition.kind === 'EntitySet')
        .reduce((objectsSoFar, definition) => {
          objectsSoFar[definition.url] = definition.name;
          return objectsSoFar;
        }, {});
    };
  }
};
