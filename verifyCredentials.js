const GenericODataClient = require('./lib/genericODataClient');

async function verify(credentials) {
  // for now sailor hasn't opportunity emit something from verify credentials context
  const genericODataClient = GenericODataClient.create(this, credentials);
  return genericODataClient.verifyCredentials();
}

module.exports = verify;
