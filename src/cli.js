'use strict'
const { promises: fs } = require('fs')
const compare = require('./index')
const chalk = require('chalk')

const clog = (...args) => console.log(chalk(...args))
const err = (...args) => console.log(chalk.red('[Error]'), ...args)

async function main () {
    clog`{blue.bold S}{blue cratch}{blue.bold S}{blue ource}{blue.bold C}{blue omparer}\n{yellow by SteveXMH}`
    if (process.argv.length <= 2) {
        clog`Usage: {yellow npm start (FilePath1) (FilePath2)}`
        clog`   Or: {yellow scsc (FilePath1) (FilePath2)} (If you used \`npm i scratch-source-comparer -g\` to install this)`
        return
    }
    const [file0, file1] = [process.argv[process.argv.length - 2], process.argv[process.argv.length - 1]]
    if (!(await fs.stat(file0)).isFile() || !(await fs.stat(file1)).isFile()) {
        err('At least one file is not existed.')
        return
    }
    const [read0, read1] = await Promise.all([fs.readFile(file0), fs.readFile(file1)])
    clog`Comparing {yellow ${file0}}\n      and {yellow ${file1}}`
    const result = await compare(read0, read1)
    console.log(result.code)
    clog`{green.bold Result}:`
    clog`Project 1:                                     {yellow ${file0}}`
    clog`Project 2:                                     {yellow ${file1}}`
    clog`{green Assets result}:`
    clog`Project 1's assets amount:                     {yellow ${result.assets.o0l}}`
    clog`Project 2's assets amount:                     {yellow ${result.assets.o1l}}`
    clog`Project 1 same assets proportion:              {yellow ${result.assets.o1l}}`
    clog`Project 2 same assets proportion:              {yellow ${result.assets.o1l}}`
    clog`Project 1's assets amount same to Project 2's: {yellow ${result.assets.o0}}`
    clog`Same list:`
    for (const key in result.assets.o0sk) {
        clog`  - {yellow ${result.assets.o0sk[key]}}`
    }
    clog`Project 2's assets amount same to Project 1's: {yellow ${result.assets.o1}}`
    clog`Same list:`
    for (const key in result.assets.o1sk) {
        clog`  - {yellow ${result.assets.o0sk[key]}}`
    }
    clog`{green Code result}: WIP`
}

main()
