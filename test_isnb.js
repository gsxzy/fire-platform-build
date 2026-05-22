const { extractIsnbHexFromCtwing, parseIsnbFrame, isnbToPlatformData } = require('/opt/my-fire-api-new/dist/utils/isnb.parser');

const body = {
  "IMEI": "",
  "IMSI": "",
  "topic": "topic/pub",
  "payload": {
    "msg": "020182a4d5c2ca11856a0dbeda0000821200ff9a000000be0000000038393836303835363131323443303738373338353836393634363038353134353333320000000000343630323430343631393837333835000000000045433830314500000000000000000000000000000000000008d2ed42000093df56312e302e305f3235303732330000000000000056312e30000000000000000000000000000000004e502d46593330302d3447000000000000000000312e352e30000000000000020200003d006000040061000100640000000000170000006100020062000000000004010200610003006200000000001a0d7200610004006200000000002e00004a"
  },
  "deviceId": "99013914869646085145332",
  "protocol": "mqtt",
  "tenantId": "2000614607",
  "upDataSN": -1,
  "productId": "17313439",
  "serviceId": "",
  "timestamp": 1779285223862,
  "deviceType": "",
  "upPacketSN": -1,
  "messageType": "dataReport",
  "assocAssetId": ""
};

const hex = extractIsnbHexFromCtwing(body);
console.log('extractIsnbHexFromCtwing:', hex ? 'found (' + hex.length + ' chars)' : 'null');

if (hex) {
  const frame = parseIsnbFrame(hex);
  console.log('parseIsnbFrame:', frame ? 'success' : 'null');
  if (frame) {
    console.log('  messageId:', frame.messageId, frame.messageTypeName);
    console.log('  devType:', frame.devType, frame.devTypeName);
    console.log('  hasAlarm:', frame.hasAlarm);
    console.log('  hasFault:', frame.hasFault);
    console.log('  channelCount:', frame.channelCount);
    console.log('  channels:', JSON.stringify(frame.channels));
    const data = isnbToPlatformData(frame);
    console.log('  isnbToPlatformData alarm:', data.alarm);
    console.log('  isnbToPlatformData _isnbParsed:', data._isnbParsed);
    console.log('  isnbToPlatformData alarmBits:', data.alarmBits);
  }
}
