#!/bin/bash
python3 -c "
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '3306'
process.env.DB_USER = 'root'
process.env.DB_PASSWORD = open('/opt/my-fire-api-new/.env').read().split('DB_PASSWORD=')[1].split('\n')[0].strip()
process.env.DB_NAME = 'fire_platform'

const sequelize = require('/opt/my-fire-api-new/dist/config/database').default

async function test() {
  const r = await sequelize.query(\"SELECT GET_LOCK('test', 10) AS acquired\", { type: 'SELECT' })
  console.log('type:', typeof r)
  console.log('isArray:', Array.isArray(r))
  console.log('length:', r.length)
  console.log('r[0]:', JSON.stringify(r[0]))
  console.log('r[0] isArray:', Array.isArray(r[0]))
  if (Array.isArray(r[0])) {
    console.log('r[0][0]:', JSON.stringify(r[0][0]))
  }
  process.exit(0)
}

test().catch(e => { console.error(e); process.exit(1) })
"
