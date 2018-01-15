/* eslint-disable camelcase */
'use strict';

const {promisify} = require('util');
const request = promisify(require('request'));

module.exports = function (emitter, cfg) {
  const fetchNewToken = async function () {
    const authTokenResponse = await request({
      url: cfg.authorizationServerTokenEndpointUrl,
      method: 'POST',
      json: true,
      form: {
        grant_type: 'refresh_token',
        client_id: cfg.oauth2_field_client_id,
        client_secret: cfg.oauth2_field_client_secret,
        refresh_token: cfg.oauth.refresh_token
      }
    });

    if (authTokenResponse.statusCode >= 400) {
      throw new Error(`Error in authentication.  Status code: ${authTokenResponse.statusCode}, Body: ${JSON.stringify(authTokenResponse.body)}`);
    }

    return authTokenResponse.body;
  };

  const getValidToken = async function () {
    if (cfg.oauth) {
      const tokenExpiryTime = new Date(cfg.oauth.tokenExpiryTime);
      const now = new Date();
      if (now < tokenExpiryTime) {
        return cfg.oauth.access_token;
      }
    }

    const tokenRefreshStartTime = new Date();
    cfg.oauth = await fetchNewToken();
    cfg.oauth.tokenExpiryTime = (new Date(tokenRefreshStartTime.getTime() + (cfg.oauth.expires_in * 1000))).toISOString();
    if (emitter && emitter.emit) {
      emitter.emit('keys', cfg.oauth);
    }
    return cfg.oauth.access_token;
  };

  // eslint-disable-next-line max-params
  this.makeRequest = async function (url, method, body = undefined, headers = {}, urlIsSegment = true) {
    const accessToken = await getValidToken();
    const urlToCall = urlIsSegment ?
      cfg.resourceServerUrl.replace(/\/$/, '') + '/' + url.replace(/^\//, '') :
      url;
    console.log(`Making ${method} request to ${urlToCall} ...`);
    console.log(`Access Token: ${accessToken}`);
    headers.Authorization = `Bearer ${accessToken}`;
    const response = await request({
      url: urlToCall,
      method,
      json: true,
      body: body,
      headers
    });

    if (response.statusCode >= 400) {
      throw new Error(`Error in making request to ${urlToCall} Status code: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
    }

    return response.body;
  };

  return this;
};
