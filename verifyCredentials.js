const logger = require('@elastic.io/component-logger')();
const GenericODataClient = require('./lib/genericODataClient');

async function verify(credentials) {
  const emitter = {
    logger,
  };
  // for now sailor hasn't opportunity emit something from verify credentials context
  const genericODataClient = GenericODataClient.create(emitter, credentials);
  return genericODataClient.verifyCredentials();
}

module.exports = verify;
