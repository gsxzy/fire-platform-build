const fs = require('fs');
const p = '/opt/my-fire-api-new/dist/app.js';
let c = fs.readFileSync(p, 'utf8');
const oldStr = `    catch (err) {
        logger_1.default.error("[Bootstrap] Failed:", err.message);
        process.exit(1);
    }`;
const newStr = `    catch (err) {
        logger_1.default.error("[Bootstrap] Failed:", err.message || err);
        console.error("[Bootstrap] RAW ERROR:", err);
        process.exit(1);
    }`;
if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  fs.writeFileSync(p, c);
  console.log('patched successfully');
} else {
  console.log('old string not found, trying alternate');
  console.log(c.indexOf('logger_1.default.error("[Bootstrap] Failed:"'));
}
