'use strict';

const RestClient = require('./restClient');

module.exports = function (emitter, cfg) {
  const restClient = new RestClient(emitter, cfg);

  this.listObjects = async function () {
    const serviceDocument = await restClient.makeRequest('', 'GET');
    console.log(`OData Serivce Document: ${JSON.stringify(serviceDocument)}`);
    return serviceDocument.value
      .filter(definition => !definition.kind || definition.kind === 'EntitySet')
      .reduce((objectsSoFar, definition) => {
        objectsSoFar[definition.url] = definition.name;
        return objectsSoFar;
      }, {});
  };

  return this;
};
