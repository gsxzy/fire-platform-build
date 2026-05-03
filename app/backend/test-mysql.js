const mysql = require('mysql2/promise');
mysql.createConnection({user:'root',database:'smart_fire',socketPath:'/tmp/mysql.sock'})
  .then(c => c.ping())
  .then(() => console.log('ok'))
  .catch(e => console.log(e.code, e.message));
