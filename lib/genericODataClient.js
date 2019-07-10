/* eslint-disable no-param-reassign */

const {
  NoAuthRestClient,
  BasicAuthRestClient,
  ApiKeyRestClient,
} = require('@elastic.io/odata-library');

const BaseODataClient = require('./commons/odata/ODataClient');

module.exports = class GenericODataClient extends BaseODataClient {
  constructor(emitter, cfg) {
    let authenticatedRestClient;
    switch (cfg.auth.type) {
      case 'No Auth':
        authenticatedRestClient = new NoAuthRestClient(emitter, cfg);
        break;
      case 'Basic Auth':
        cfg.username = cfg.auth.basic.username;
        cfg.password = cfg.auth.basic.password;
        authenticatedRestClient = new BasicAuthRestClient(emitter, cfg);
        break;
      case 'API Key Auth':
        cfg.apiKeyHeaderName = cfg.auth.apiKey.headerName;
        cfg.apiKeyHeaderValue = cfg.auth.apiKey.headerValue;
        authenticatedRestClient = new ApiKeyRestClient(emitter, cfg);
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
