import json,sys
d=json.load(sys.stdin)
for p in d:
    if p.get("name")=="fire-platform":
        print("pm_exec_path:",p.get("pm_exec_path"))
        print("exec_mode:",p.get("exec_mode"))
        print("instances:",p.get("instances"))
        print("min_uptime:",p.get("min_uptime"))
        print("max_restarts:",p.get("max_restarts"))
        print("kill_timeout:",p.get("kill_timeout"))
        print("listen_timeout:",p.get("listen_timeout"))
        print("pm_uptime:",p.get("pm_uptime"))
        print("unstable_restarts:",p.get("unstable_restarts"))
        break
