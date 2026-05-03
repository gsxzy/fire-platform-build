import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("0.0.0.0", 5060))
s.settimeout(15)
print("UDP listening on 0.0.0.0:5060...")
try:
    data, addr = s.recvfrom(2048)
    print(f"RECEIVED from {addr}: {data[:200]}")
except socket.timeout:
    print("TIMEOUT: No UDP packet received in 15 seconds")
