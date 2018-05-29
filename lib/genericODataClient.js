'use strict';

const BaseODataClient = require('./commons/odata/ODataClient');
const {NoAuthRestClient, BasicAuthRestClient, ApiKeyRestClient} = require('./commons/authentication/statelessAuthenticationRestClients');

module.exports = class GenericODataClient extends BaseODataClient {
  constructor(emitter, cfg) {
    let authenticatedRestClient;
    switch (cfg.auth.type) {
      case 'No Auth':
        authenticatedRestClient = new NoAuthRestClient(emitter, cfg);
        break;
      case 'Basic Auth':
        authenticatedRestClient = new BasicAuthRestClient(emitter, cfg, cfg.auth.basic.username, cfg.auth.basic.password);
        break;
      case 'API Key Auth':
        authenticatedRestClient = new ApiKeyRestClient(emitter, cfg, cfg.auth.apiKey.headerName, cfg.auth.apiKey.headerValue);
        break;
      default:
        throw new Error(`Auth Type ${cfg.auth.type} not yet implemented.`);
    }

    super(emitter, cfg, authenticatedRestClient);
  }

  static create(emitter, cfg) {
    return new GenericODataClient(emitter, cfg);
  }
};
