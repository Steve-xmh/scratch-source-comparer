const comparer = require('../src')
const fs = require('fs')
const { join } = require('path')
/*
comparer(fs.readFileSync(join(__dirname, './TestProject0.sb3')), fs.readFileSync(join(__dirname, './TestProject1.sb3')))
    .then((v) => console.log(v))
*/
let lastLen = 0
comparer(
    fs.readFileSync(join(__dirname, './TestProject-VerySame-0.sb3')),
    fs.readFileSync(join(__dirname, './TestProject-VerySame-1.sb3')),
    msg => {
        const printStr = msg.progress.toFixed(2) + '  ' + msg.text
        process.stdout.write(printStr + '  '.repeat((lastLen - printStr.length) > 0 ? (lastLen - printStr.length) : 0) + '\r')
        lastLen = printStr.length
    }
).then(async (v) => {
    process.stdout.write('  '.repeat(lastLen) + '\n')
    console.log(v)
    console.log(`Generated json length: ${JSON.stringify(v).length}`)
})
