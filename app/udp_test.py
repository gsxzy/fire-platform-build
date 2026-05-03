import socket
import time
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("124.223.35.58", 15060))
time.sleep(2)
s.sendto(b"test", ("42.91.141.38", 12239))
s.close()
