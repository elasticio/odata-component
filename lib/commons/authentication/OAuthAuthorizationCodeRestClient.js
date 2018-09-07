/* eslint-disable camelcase */
'use strict';

const {promisify} = require('util');
const request = promisify(require('request'));
const removeTrailingSlash = require('remove-trailing-slash');
const removeLeadingSlash = require('remove-leading-slash');

module.exports = class OAuthAuthorizationCodeRestClient {
  constructor(emitter, cfg) {
    this.emitter = emitter;
    this.cfg = cfg;
  }

  async _fetchNewToken() {
    console.log('Fetching new token...');
    const authTokenResponse = await request({
      url: this.cfg.authorizationServerTokenEndpointUrl,
      method: 'POST',
      json: true,
      form: {
        grant_type: 'refresh_token',
        client_id: this.cfg.oauth2_field_client_id,
        client_secret: this.cfg.oauth2_field_client_secret,
        refresh_token: this.cfg.oauth.refresh_token
      }
    });

    if (authTokenResponse.statusCode >= 400) {
      throw new Error(`Error in authentication.  Status code: ${authTokenResponse.statusCode}, Body: ${JSON.stringify(authTokenResponse.body)}`);
    }

    return authTokenResponse.body;
  }

  async _getValidToken() {
    if (this.cfg.oauth) {
      const tokenExpiryTime = new Date(this.cfg.oauth.tokenExpiryTime);
      const now = new Date();
      if (now < tokenExpiryTime) {
        console.log('Previously valid token found.');
        return this.cfg.oauth.access_token;
      }
    }

    const tokenRefreshStartTime = new Date();
    this.cfg.oauth = await this._fetchNewToken();
    this.cfg.oauth.tokenExpiryTime = (new Date(tokenRefreshStartTime.getTime() + (this.cfg.oauth.expires_in * 1000))).toISOString();
    if (this.emitter && this.emitter.emit) {
      this.emitter.emit('keys', this.cfg.oauth);
    }
    return this.cfg.oauth.access_token;
  }

  // options expects the following sub-variables:
  //    url: Url to call
  //    method: HTTP verb to use
  //    body: Body of the request, if applicable. Defaults to undefined.
  //    headers: Any HTTP headers to add to the request. Defaults to {}
  //    urlIsSegment: Whether to append to the base server url or if the provided URL is an absolute path. Defaults to true
  async makeRequest(options) {
    const {url, method, body, headers = {}, urlIsSegment = true, isJson = true} = options;
    const accessToken = await this._getValidToken();
    const urlToCall = urlIsSegment
      ? removeTrailingSlash(this.cfg.resourceServerUrl.trim()) + '/' + removeLeadingSlash(url.trim()) // Trim trailing or leading '/'
      : url.trim();
    console.log(`Making ${method} request to ${urlToCall} ...`);
    if (this.cfg.printOAuthToken == '1') {
      console.log(`OAuth Access token: ${accessToken}`);
    }
    headers.Authorization = `Bearer ${accessToken}`;

    const response = await request({
      url: urlToCall,
      method,
      json: isJson,
      body: body,
      headers
    });

    if (response.statusCode >= 400) {
      throw new Error(`Error in making request to ${urlToCall} Status code: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
    }

    return response.body;
  }
};
