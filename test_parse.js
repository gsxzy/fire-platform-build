const { parseDeviceStatus } = require("./dist/protocols/fscn8001.service.js");
const buf = Buffer.from("40409E07010113141509051A2211AA3B000000000000000030000202010101000200010003000000000000000000000000000000000000000000000000000000000000000013141509051AC42323", "hex");
const dataLen = buf.readUInt16LE(24);
const data = buf.subarray(27, 27 + dataLen);
console.log("typeFlag:", data[0], "count:", data[1]);
const events = parseDeviceStatus(data);
console.log("events:", JSON.stringify(events, null, 2));
