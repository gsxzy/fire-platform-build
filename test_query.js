const fs = require('fs');
const env = fs.readFileSync('/opt/my-fire-api-new/.env', 'utf8');
env.split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0 && !line.startsWith('#')) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
});
const db = require("/opt/my-fire-api-new/dist/config/database").default;
async function test() {
  try {
    const r1 = await db.query("SELECT 1 as a", {type: "SELECT"});
    console.log("SELECT:", JSON.stringify(r1), "len:", r1.length);
    const { QueryTypes } = require('sequelize');
    const r2 = await db.query("SELECT 1 as a", {type: QueryTypes.RAW});
    console.log("RAW:", JSON.stringify(r2), "len:", r2.length);
    const r3 = await db.query("SELECT 1 as a");
    console.log("NO TYPE:", JSON.stringify(r3), "len:", r3.length);
  } catch(e) { console.error("ERR", e.message); }
  await db.close();
}
test();
