import socket
import time

# Test IPv6 socket with IPv4-mapped address
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
s.bind(("::ffff:124.223.35.58", 15061, 0, 0))
time.sleep(2)
s.sendto(b"test6", ("::ffff:42.91.141.38", 12239, 0, 0))
s.close()
