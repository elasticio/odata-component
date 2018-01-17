'use strict';

const ODataClient = require('../oDataClient');
const {messages} = require('elasticio-node');

exports.process = async function (msg, cfg, snapshot = {}) {
  const oDataClient = new ODataClient(this, cfg);
  if (snapshot.deltaLink) {
    // Follow Delta link
    console.log(`Current delta link: ${snapshot.deltaLink}`);
    const linkResults = await oDataClient.makeRequest(snapshot.deltaLink, 'GET', undefined, {}, false);
    linkResults.value.forEach(record => this.emit('data', messages.newMessageWithBody(record)));
    this.emit('snapshot', {deltaLink: linkResults['@odata.deltaLink']});
    console.log(`Next delta link: ${linkResults['@odata.deltaLink']}`);
  } else {
    console.log(`No delta link detected.  Requesting one...`);
    const linkResults = await oDataClient.makeRequest(cfg.objectType, 'GET', undefined, {Prefer: 'odata.track-changes'});
    this.emit('snapshot', {deltaLink: linkResults['@odata.deltaLink']});
    console.log(`Next delta link: ${linkResults['@odata.deltaLink']}`);
  }
};

exports.getObjects = async function (cfg) {
  const oDataClient = new ODataClient(this, cfg);
  return oDataClient.listObjects();
};
