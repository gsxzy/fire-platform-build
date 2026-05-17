const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node migrate-responses.js <file1> [file2...]');
  process.exit(1);
}

for (const rel of files) {
  const filePath = path.isAbsolute(rel) ? rel : path.join(__dirname, '..', rel);
  let s = fs.readFileSync(filePath, 'utf8');
  if (s.includes("from '@/utils/respond'")) {
    console.log('skip (already migrated):', rel);
    continue;
  }

  if (s.includes("success, fail, page")) {
    s = s.replace(
      "import { success, fail, page } from '@/utils/response';",
      "import { sendSuccess, sendPage } from '@/utils/respond';\nimport { fail } from '@/utils/response';\nimport { HttpError } from '@/utils/httpError';"
    );
  } else if (s.includes("success, fail")) {
    s = s.replace(
      "import { success, fail } from '@/utils/response';",
      "import { sendSuccess } from '@/utils/respond';\nimport { fail } from '@/utils/response';\nimport { HttpError } from '@/utils/httpError';"
    );
  } else {
    console.log('skip (no response import):', rel);
    continue;
  }

  s = s.replace(/return res\.json\(page\(/g, 'sendPage(res, req, ');
  s = s.replace(/return res\.json\(success\(/g, 'sendSuccess(res, req, ');
  s = s.replace(/return res\.status\((\d+)\)\.json\(fail\(([^)]+)\)\);/g, 'throw new HttpError($2, $1);');
  s = s.replace(/(send(?:Success|Page)\(res, req,[^;]+)\)\);/g, '$1);');

  fs.writeFileSync(filePath, s, 'utf8');
  console.log('migrated:', rel);
}
