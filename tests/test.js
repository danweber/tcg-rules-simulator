let fs = require('fs');
let filename = process.argv[2];
let str = fs.readFileSync(filename, 'utf-8');
let out = encodeURIComponent(str);
console.log(out);
