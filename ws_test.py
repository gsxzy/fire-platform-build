import websocket
import sys
try:
    ws = websocket.create_connection("ws://127.0.0.1:5003/ws?token=test", timeout=5)
    print("WS connected OK")
    ws.close()
except Exception as e:
    print("WS error:", e)
    sys.exit(1)
