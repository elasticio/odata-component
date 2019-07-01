/* eslint-disable global-require */

const statelessAuthenticationRestClients = require('./lib/commons/authentication/statelessAuthenticationRestClients');

module.exports = {
  Authentication: {
    OAuthAuthorizationCodeRestClient: require('./lib/commons/authentication/OAuthAuthorizationCodeRestClient'),
    NoAuthRestClient: statelessAuthenticationRestClients.NoAuthRestClient,
    BasicAuthRestClient: statelessAuthenticationRestClients.BasicAuthRestClient,
    ApiKeyRestClient: statelessAuthenticationRestClients.ApiKeyRestClient,
  },
  OData: {
    ODataClient: require('./lib/commons/odata/ODataClient'),
  },
  JsonSchema: {
    convertJsonSchemaToEioSchema: require('./lib/commons/jsonSchema/jsonSchemaConversionUtil').convertJsonSchemaToEioSchema,
  },
};
