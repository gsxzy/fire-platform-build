const WVP = require('/opt/my-fire-api-new/dist/services/wvp.service.js');
WVP.getStream('34020000001300000001', '34020000001300000001')
  .then(r => console.log('RESULT:', JSON.stringify(r)))
  .catch(e => console.log('ERROR:', e.message));
