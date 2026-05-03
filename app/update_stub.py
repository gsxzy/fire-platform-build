import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/routes/stub.js')
content = stdout.read().decode('utf-8', errors='replace')

# Add linkage routes before module.exports
linkage_routes = """
/* ═══════ 40. 安消联动 ═══════ */
router.get('/linkage-rules/list', async (req, res) => queryList(req, res, 'linkage_rules'));
router.get('/linkage-rules/:id', async (req, res) => queryById(req, res, 'linkage_rules'));
router.post('/linkage-rules', async (req, res) => createRow(req, res, 'linkage_rules'));
router.put('/linkage-rules/:id', async (req, res) => updateRow(req, res, 'linkage_rules'));
router.delete('/linkage-rules/:id', async (req, res) => deleteRow(req, res, 'linkage_rules'));

router.get('/linkage-records/list', async (req, res) => queryList(req, res, 'linkage_records'));
router.get('/linkage-records/:id', async (req, res) => queryById(req, res, 'linkage_records'));

"""

if '/linkage-rules/list' not in content:
    content = content.replace('module.exports = router;', linkage_routes + 'module.exports = router;')
    stdin, stdout, stderr = client.exec_command("cat > /opt/my-fire-api/routes/stub.js << 'EOF'\n" + content + "\nEOF")
    print('Added linkage routes to stub.js')
else:
    print('Linkage routes already exist')

client.close()
