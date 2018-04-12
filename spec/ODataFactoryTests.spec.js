'use strict';

it('Factory Tests', function () {
  // Verify that all files can be imported
  require('../lib/actions/upsertObject');
  require('../lib/actions/lookupObjectByFields');
  require('../lib/triggers/getObjectsPolling');
  require('../verifyCredentials');
});
