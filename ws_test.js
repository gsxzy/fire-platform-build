const WebSocket = require("ws");
const ws = new WebSocket("ws://127.0.0.1:5003/ws?token=test");
ws.on("open", () => {
  console.log("WS connected OK");
  ws.close();
  process.exit(0);
});
ws.on("error", (e) => {
  console.log("WS error:", e.message);
  process.exit(1);
});
setTimeout(() => {
  console.log("WS timeout");
  process.exit(1);
}, 5000);
