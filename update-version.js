const fs = require('fs');
const {join} = require('path');

const path = join(__dirname, 'README.md');
let contents = fs.readFileSync(path, 'utf8');
const version = require('./package').version;

contents = contents.replace(/\?branch=master/g, `?branch=${version}`);
fs.writeFileSync(path, contents);
