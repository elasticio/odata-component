'use strict';

const ODataClient = require('./lib/genericODataClient');

module.exports = async function (cfg) {
  try {
    const instance = new ODataClient(this, cfg);
    // Fetch service document
    await instance.makeRequest('', 'GET');
    console.log('Successfully verified credentials.');
    return true;
  } catch (e) {
    // Workaround for https://github.com/elasticio/sailor-nodejs/issues/58
    console.log(`Exception: ${e.toString()} \n ${e.stack}`);
    return false;
  }
};
