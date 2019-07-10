/* eslint-disable no-unused-expressions */

const chai = require('chai');
const { expect } = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const verify = require('../verifyCredentials');

chai.use(chaiAsPromised);

describe('Verify Credentials', () => {
  it(' successfully for No Auth', async () => {
    const configuration = {
      auth: {
        type: 'No Auth',
        basic: { username: '', password: '' },
        apiKey: { headerName: '', headerValue: '' },
        hmacSecret: null,
      },
      resourceServerUrl: 'http://www.example.com',
    };

    nock('http://www.example.com')
      .get('/')
      .reply(200, { result: 'OK' });

    const result = await verify(configuration);
    expect(result).to.be.true;
  });

  it(' unsuccessfully for No Auth', async () => {
    const configuration = {
      auth: {
        type: 'No Auth',
        basic: { username: '', password: '' },
        apiKey: { headerName: '', headerValue: '' },
        hmacSecret: null,
      },
      resourceServerUrl: 'http://www.example.com',
    };

    nock('http://www.example.com')
      .get('/')
      .reply(400, { result: 'ERROR' });

    const result = await verify(configuration);
    expect(result).to.be.false;
  });

  it(' successfully for Basic Auth', async () => {
    const configuration = {
      auth: {
        type: 'Basic Auth',
        basic: { username: 'name', password: 'pass' },
        apiKey: { headerName: '', headerValue: '' },
        hmacSecret: null,
      },
      resourceServerUrl: 'http://www.example.com',
    };

    nock('http://www.example.com', {
      reqheaders: {
        authorization: 'Basic bmFtZTpwYXNz',
      },
    }).get('/')
      .reply(200, { result: 'OK' });

    const result = await verify(configuration);
    expect(result).to.be.true;
  });

  it(' unsuccessfully for Basic Auth', async () => {
    const configuration = {
      auth: {
        type: 'Basic Auth',
        basic: { username: 'name', password: 'pass' },
        apiKey: { headerName: '', headerValue: '' },
        hmacSecret: null,
      },
      resourceServerUrl: 'http://www.example.com',
    };

    nock('http://www.example.com')
      .get('/')
      .reply(400, { result: 'ERROR' });

    const result = await verify(configuration);
    expect(result).to.be.false;
  });

  it(' successfully for API Key Auth', async () => {
    const configuration = {
      auth: {
        type: 'API Key Auth',
        basic: { username: '', password: '' },
        apiKey: { headerName: 'header_name', headerValue: 'header_value' },
        hmacSecret: null,
      },
      resourceServerUrl: 'http://www.example.com',
    };

    nock('http://www.example.com', {
      reqheaders: {
        [configuration.auth.apiKey.headerName]: configuration.auth.apiKey.headerValue,
      },
    }).get('/')
      .reply(200, { result: 'OK' });

    const result = await verify(configuration);
    expect(result).to.be.true;
  });

  it(' successfully for API Key Auth', async () => {
    const configuration = {
      auth: {
        type: 'API Key Auth',
        basic: { username: '', password: '' },
        apiKey: { headerName: 'header_name', headerValue: 'header_value' },
        hmacSecret: null,
      },
      resourceServerUrl: 'http://www.example.com',
    };

    nock('http://www.example.com')
      .get('/')
      .reply(400, { result: 'ERROR' });

    const result = await verify(configuration);
    expect(result).to.be.false;
  });
});
