const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/app/page.tsx', c);
