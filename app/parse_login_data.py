frames = [
    "4040010001052B350D1C041A8C0000000000000000000000030002BE0100FE2323",
    "40401D0001051C2C0D1C041A8C0000000000000000000000030002BE0100022323",
]

for f in frames:
    data_hex = f[10:-6]  # skip @@(4) + seq(4) + cmd(2), and cs(2) + ##(4)
    # Actually let's parse properly:
    # @@ = 40 40 (4 hex chars)
    # seq = 2 bytes (4 hex chars)
    # cmd = 1 byte (2 hex chars)
    # data = rest before cs + ##
    # cs = 1 byte (2 hex chars) before ##
    # ## = 23 23 (4 hex chars)
    
    # Full frame: 40 40 + seq(2) + cmd(1) + data(n) + cs(1) + 23 23
    # In hex string: 4 + 4 + 2 + data*2 + 2 + 4 = total hex chars
    
    total_bytes = len(f) // 2
    data_len = total_bytes - 7  # remove @@(2) + seq(2) + cmd(1) + cs(1) + ##(2)
    
    # data starts at byte 5 (index 10 in hex string)
    data_start = 10
    data_end = data_start + data_len * 2
    data_hex_full = f[data_start:data_end]
    
    # Parse: building_id(4B) + device_id(6B) + password(6B) + extra...
    building_id = data_hex_full[0:8]
    device_id = data_hex_full[8:20]
    password = data_hex_full[20:32]
    extra = data_hex_full[32:]
    
    print(f"Frame: {f}")
    print(f"  Total bytes: {total_bytes}")
    print(f"  Data bytes: {data_len}")
    print(f"  Building ID: {building_id}")
    print(f"  Device ID: {device_id}")
    print(f"  Password: {password}")
    print(f"  Extra data: {extra}")
    
    if extra:
        # Try to parse extra as individual bytes
        extra_bytes = [extra[i:i+2] for i in range(0, len(extra), 2)]
        print(f"  Extra bytes: {' '.join(extra_bytes)}")
        
        # Try various interpretations
        if len(extra_bytes) >= 2:
            print(f"  Byte analysis:")
            for i, b in enumerate(extra_bytes):
                val = int(b, 16)
                print(f"    [{i}] 0x{b} = {val} (0b{val:08b})")
    print()
