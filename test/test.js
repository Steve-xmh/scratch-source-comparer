const comparer = require('../src')
const fs = require('fs')
const { join } = require('path')

comparer(fs.readFileSync(join(__dirname, './TestProject0.sb3')), fs.readFileSync(join(__dirname, './TestProject1.sb3')))
    .then((v) => console.log(v))
