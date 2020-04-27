'use strict'
const { promises: fs, existsSync } = require('fs')
const compare = require('./index')
const getSummary = require('./summary')
const chalk = require('chalk')
const { resolve } = require('path')

const clog = (...args) => console.log(chalk(...args))
const err = (...args) => console.log(chalk.red('[Error]'), ...args)

async function main () {
    clog`{blue.bold S}{blue cratch}{blue.bold S}{blue ource}{blue.bold C}{blue omparer}\n{yellow by SteveXMH}`
    if (process.argv.length <= 2 || process.argv.includes('--help')) {
        clog`Usage: {yellow npm start (FilePath1) (FilePath2)}`
        clog`   Or: {yellow scsc (FilePath1) (FilePath2)} (If you used \`npm i scratch-source-comparer -g\` to install this)`
        return
    }
    const [file0, file1] = [resolve(__dirname, process.argv[process.argv.length - 2]), resolve(__dirname, process.argv[process.argv.length - 1])]
    try {
        if (!existsSync(file0) || !(await existsSync(file0)).isFile()) {
            err('File1 is not existed: ', file0)
            return
        }
        if (!existsSync(file1) || !(await fs.stat(file1)).isFile()) {
            err('File2 is not existed.', file1)
            return
        }
    } catch (err) {

    }
    const [read0, read1] = await Promise.all([fs.readFile(file0), fs.readFile(file1)])
    clog`Comparing {yellow ${file0}}\n      and {yellow ${file1}}`
    const result = await compare(read0, read1)
    let proj0samularty = 0
    let proj1samularty = 0
    for (const block in result.code.code0.same) {
        if (block !== 'length') {
            proj0samularty += result.code.code0.same[block].simularty
        }
    }
    for (const block in result.code.code1.same) {
        if (block !== 'length') {
            proj1samularty += result.code.code1.same[block].simularty
        }
    }

    const final = (result.assets.objectSameAmount0 / result.assets.objectAmount1 * 0.3) + (proj1samularty / result.code.code1length * 0.7)
    const summary = getSummary(final, true)

    clog`{green.bold Result}:`
    clog`Project 1:                                     {yellow ${file0}}`
    clog`Project 2:                                     {yellow ${file1}}`
    clog`{green Assets result}:`
    clog`Project 1's assets amount:                     {yellow ${result.assets.objectSameAmount0}}`
    clog`Project 2's assets amount:                     {yellow ${result.assets.objectSameAmount1}}`
    clog`Project 1's same assets amount:                {yellow ${result.assets.objectAmount0}}`
    clog`Project 2's same assets amount:                {yellow ${result.assets.objectAmount1}}`
    clog`Project 1 same assets proportion:              {yellow ${result.assets.objectSameAmount0 / result.assets.objectAmount0 * 100}%}`
    clog`Project 2 same assets proportion:              {yellow ${result.assets.objectSameAmount1 / result.assets.objectAmount1 * 100}%}`
    clog`Same list:`
    for (const key in result.assets.objectSameKey0) {
        clog`  - {yellow ${result.assets.objectSameKey0[key]}}`
    }
    clog`Project 2's assets amount same to Project 1's: {yellow ${result.assets.objectSameAmount1}}`
    clog`Same list:`
    for (const key in result.assets.objectSameKey1) {
        clog`  - {yellow ${result.assets.objectSameKey0[key]}}`
    }
    clog`{green Code result}:`
    clog`Project 1's program trees amount:              {yellow ${result.code.code0length}}`
    clog`Project 2's program trees amount:              {yellow ${result.code.code1length}}`
    clog`Project 1's program trees same amount:         {yellow ${result.code.code0.length}}`
    clog`Project 2's program trees same amount:         {yellow ${result.code.code1.length}}`
    clog`Project 1's program tree same proportion:      {yellow ${proj0samularty / result.code.code0length * 100}%}`
    clog`Project 2's program tree same proportion:      {yellow ${proj1samularty / result.code.code1length * 100}%}`
    clog`{green Final result}:`
    clog`Project simularty:                             {yellow ${final * 100}%}`
    clog`Summary:                                       ${summary}`
}

main()
