'use strict'
const { promises: fs } = require('fs')
const codeComparer = require('./codeComparer')
const readline = require('readline')
const summary = require('./summary')
const md5 = require('md5')
const jszip = require('jszip')

// The md5 inside this list will be ignored in compare.
const ignoreMD5List = [
    '83a9787d4cb6f3b7632b4ddfebf74367',
    '83c36d806dc92327b9e7049a565c6bff',
    'cd21514d0531fdffb22204e0ec5ed84a',
    'b7853f557e4426412e64bb3da6531a99',
    'ee1c4946b2fbefa4479c1cd60653fb46',
    ''
]

/**
 * Compare the same between two objects
 * @param {Object} o0 First object
 * @param {Array<any>} o1 Second object
 * @returns {{o0:number,o1:number,o0l:number,o1l:number}} The result
*/
function compareObject (o0, o1) {
    const result = {
        o0: 0,
        o1: 0,
        o0l: 0,
        o1l: 0,
        o0s: [],
        o1s: [],
        o0sk: {},
        o1sk: {}
    }
    for (const okey in o0) {
        const item = o0[okey]
        result.o0l++
        if (ignoreMD5List.indexOf(item) !== -1) continue
        for (const key in o1) {
            const comp = o1[key]
            // console.log(comp, item)
            if (comp === item) {
                result.o0s.push(item)
                result.o0sk[item] = okey
                result.o0++
                break
            }
        }
    }
    for (const okey in o1) {
        const item = o1[okey]
        result.o1l++
        if (ignoreMD5List.indexOf(item) !== -1) continue
        for (const key in o0) {
            const comp = o0[key]
            if (comp === item) {
                result.o1s.push(item)
                result.o1sk[item] = okey
                result.o1++
                break
            }
        }
    }
    return result
}

/**
 * Compare two project, return a result object.
 * @param {Buffer|ArrayBuffer|String|Blob|ReadableStream} project0 The project to compare.
 * @param {Buffer|ArrayBuffer|String|Blob|ReadableStream} project1 The project to be compared.
 * @returns {Promise<Object>} The result.
 */
async function compare (project0, project1) {
    const [zip0, zip1] = await Promise.all([jszip.loadAsync(project0), jszip.loadAsync(project1)])
    const md50 = {}
    const md51 = {}
    const threads = []
    const result = {}
    /**
     * Collect file hash from zip.
     * @param {jszip} zip The JSZip Object contains file.
     * @param {Array} array An array object stores hashes.
     */
    function collectHash (zip, array) {
        zip.forEach((rpath, file) => {
            if (rpath === 'project.json') return
            threads.push((async () => {
                const data = await file.async('uint8array')
                array[rpath] = md5(data)
            })())
        })
    }

    collectHash(zip0, md50)
    collectHash(zip1, md51)
    await Promise.all(threads)
    // console.log(md50, md51)
    result.assets = compareObject(md50, md51)
    const [projectJson0, projectJson1] = await Promise.all([
        (async () => JSON.parse(await zip0.file('project.json').async('string')))(),
        (async () => JSON.parse(await zip1.file('project.json').async('string')))()
    ])
    
    return result
}

module.exports = compare
