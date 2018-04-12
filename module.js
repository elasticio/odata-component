'use strict';

module.exports = {
  Authentication: {
    OAuthAuthorizationCodeRestClient: require('./lib/commons/authentication/OAuthAuthorizationCodeRestClient')
  },
  OData: {
    ODataClient: require('./lib/commons/odata/ODataClient')
  }
};
