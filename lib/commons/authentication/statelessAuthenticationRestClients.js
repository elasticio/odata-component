'use strict';

const {promisify} = require('util');
const request = promisify(require('request'));
const removeTrailingSlash = require('remove-trailing-slash');
const removeLeadingSlash = require('remove-leading-slash');

const NoAuthRestClient = class NoAuthRestClient {
  constructor(emitter, cfg, globalSkipRules = []) {
    this.emitter = emitter;
    this.cfg = cfg;
    this.globalSkipRules = globalSkipRules;
  }

  // eslint-disable-next-line no-unused-vars
  _addAuthenticationToRequestOptions(requestOptions) {}

  // options expects the following sub-variables:
  //    url: Url to call
  //    method: HTTP verb to use
  //    body: Body of the request, if applicable. Defaults to undefined.
  //    headers: Any HTTP headers to add to the request. Defaults to {}
  //    urlIsSegment: Whether to append to the base server url or if the provided URL is an absolute path. Defaults to true
  async makeRequest(options) {
    const {url, method, body, headers = {}, urlIsSegment = true, isJson = true, requestSkipRules = []} = options;
    const urlToCall = urlIsSegment ?
      removeTrailingSlash(this.cfg.resourceServerUrl.trim()) + '/' + removeLeadingSlash(url.trim()) : // Trim trailing or leading '/'
      url.trim();
    console.log(`Making ${method} request to ${urlToCall} ...`);

    const requestOptions = {
      url: urlToCall,
      method,
      json: isJson,
      body: body,
      headers
    };

    this._addAuthenticationToRequestOptions(requestOptions);

    const response = await request(requestOptions);

    if (response.statusCode >= 400) {
      if([...this.globalSkipRules, ...requestSkipRules].some(skipRule => skipRule(response))) {
        console.log(`Response code ${response.statusCode} from ${urlToCall} that matched a skip rule.`);
        return response.body;
      }
      console.log(`Error in making request to ${urlToCall} Status code: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
      throw new Error(`Error in making request to ${urlToCall} Status code: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
    }
    console.log(`Success in making request to ${urlToCall} Status code: ${response.statusCode}`);

    return response.body;
  }
};
module.exports.NoAuthRestClient = NoAuthRestClient;

module.exports.BasicAuthRestClient = class BasicAuthRestClient extends NoAuthRestClient{
  constructor(emitter, cfg, username, password) {
    super(emitter, cfg);
    this.username = username;
    this.password = password;
  }

  _addAuthenticationToRequestOptions(requestOptions) {
    requestOptions.auth = {
      username: this.username,
      password: this.password
    };
  }
};

module.exports.ApiKeyRestClient = class ApiKeyRestClient extends NoAuthRestClient{
  constructor(emitter, cfg, apiKeyHeaderName, apiKeyHeaderValue) {
    super(emitter, cfg);
    this.apiKeyHeaderName = apiKeyHeaderName;
    this.apiKeyHeaderValue = apiKeyHeaderValue;
  }

  _addAuthenticationToRequestOptions(requestOptions) {
    requestOptions.headers[this.apiKeyHeaderName] = this.apiKeyHeaderValue;
  }
};

