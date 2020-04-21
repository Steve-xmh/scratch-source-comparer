'use strict'
// const summary = require('./summary')
const prettydiff = require('prettydiff')
const VisualMachine = require('scratch-vm/src/index')
const minilog = require('minilog')
// TODO: Use imagejs to compare images
const imagejs = require('image-js')
const isNode = !(typeof window !== 'undefined' && window !== null)
const md5 = data => isNode ? require('crypto').createHash('md5').update(data).digest('hex') : require('md5')(data)
const jszip = require('jszip')
// Prevent blocking
/** @returns {Promise<void>} */
const waitTick = () => new Promise(resolve => setTimeout(resolve, 0))

// The md5 inside this list will be ignored in compare.
const ignoreMD5List = [
    '83a9787d4cb6f3b7632b4ddfebf74367',
    '83c36d806dc92327b9e7049a565c6bff',
    'cd21514d0531fdffb22204e0ec5ed84a',
    'b7853f557e4426412e64bb3da6531a99',
    'ee1c4946b2fbefa4479c1cd60653fb46',
    'd6118ccd46404fb73d4e9454d610b9ac',
    '8b8a0a49e7f5ece89ada8c069bf5a7ff',
    '547019f968041480c14ddf76113bae3d',
    '7085b3e5732e3689a4ba6a8ad98be814',
    '9e4bdaa40445a5cf843ffb031838b295',
    'b578feebd8a0bdba72e38dc61887cce1',
    'd8e8f89e256b5c131593c0919581a34f',
    ''
]

class Block {
    // 传入工程模块原型创建模块对象
    constructor (protoBlock) {
        this.opcode = protoBlock.opcode
        this.next = protoBlock.next
        this.parent = protoBlock.parent
        this.inputs = protoBlock.inputs
        this.fields = protoBlock.fields
        this.shadow = protoBlock.shadow
        this.topLevel = protoBlock.topLevel
        this.x = protoBlock.x
        this.y = protoBlock.y
    }

    get type () { return 'steve-block' };
    // 转换成字符串
    toFormatedString (indent = 0) {
        let ret = `${this.topLevel ? 'function ' : ''}${this.opcode}()${this.topLevel ? '' : ';'}`
        if (this.opcode === 'control_if' ||
            this.opcode === 'control_if_else') {
            ret = 'if(true){'
        } else if (this.opcode === 'control_forever' ||
            this.opcode === 'control_repeat' ||
            this.opcode === 'control_repeat_until' ||
            this.opcode === 'control_while' ||
            this.opcode === 'control_for_each') {
            ret = 'while(true)'
        }
        if (this.topLevel) ret += '{'
        if (this.next) {
            ret += ` ${this.next.toFormatedString(indent + 1)}`
        }
        if (this.inputs.SUBSTACK) {
            ret += `{${this.inputs.SUBSTACK[1].toFormatedString(indent + 1)}}`
        }
        if (this.inputs.SUBSTACK2) {
            ret += `else{${this.inputs.SUBSTACK2[1].toFormatedString(indent + 1)}}`
        }
        if (this.topLevel ||
            this.opcode === 'control_if' ||
            this.opcode === 'control_if_else') ret += `${'\t'.repeat(indent)}}`
        return ret
    };
}

// 将模块链接成一个树表
function fixBlock (block, blocks) {
    if (typeof block !== 'object') throw new Error('没有传入模块参数！')
    if (typeof blocks !== 'object') throw new Error('没有传入模块表参数！')

    const b = new Block(block)
    if (b.next) {
        b.next = fixBlock(blocks[b.next], blocks)
        b.next.parent = b
    }
    if (b.inputs.SUBSTACK && b.inputs.SUBSTACK[1]) {
        b.inputs.SUBSTACK[1] = fixBlock(blocks[b.inputs.SUBSTACK[1]], blocks)
        b.inputs.SUBSTACK[1].parent = b
    } else {
        b.inputs.SUBSTACK = undefined
    }

    if (b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1]) {
        b.inputs.SUBSTACK2[1] = fixBlock(blocks[b.inputs.SUBSTACK2[1]], blocks)
        b.inputs.SUBSTACK2[1].parent = b
    } else {
        b.inputs.SUBSTACK2 = undefined
    }

    return b
}

async function compareCode (project0, project1, progress = () => {}) {
    let total = 0
    let cur = 0
    async function makeCodeTree (project) {
        const array = []
        for (const target of project.targets) {
            for (const id in target.blocks) {
                await waitTick()
                const block = target.blocks[id]
                if (block instanceof Object && !(block instanceof Array)) { // Array is an independent variable
                    if (block.opcode &&
                        block.opcode.startsWith('event_') &&
                        block.opcode !== 'event_broadcastandwait' &&
                        block.opcode !== 'event_broadcast') { // Event hat block
                        array.push({
                            id,
                            code: fixBlock(block, target.blocks).toFormatedString()
                        })
                        total++
                        progress({ text: `正在构建伪代码 (${total})`, progress: 50 + total * 0.02 })
                    } else if (block.opcode) {
                        switch (block.opcode) { // Some special hat blocks.
                        case 'procedures_definition':
                        case 'control_start_as_clone':
                            array.push({
                                id,
                                code: fixBlock(block, target.blocks).toFormatedString()
                            })
                            total++
                            progress({ text: `正在构建伪代码 (${total})`, progress: 50 + total * 0.02 })
                            break
                        default:
                        }
                    }
                }
            }
        }
        return array
    }
    async function compareTree (codeTrees0, codeTrees1) {
        const result = { same: {}, length: 0 }
        const sameObj = result.same
        for (const tree0 of codeTrees0) {
            prettydiff.options.source = tree0.code
            let samest = null
            for (const tree1 of codeTrees1) {
                await waitTick()
                let equalsLines = 0
                let changedLine = 0
                if (tree0.code === tree1.code) {
                    sameObj[tree0.id] = {
                        simularTo: tree1.id,
                        code0: tree0.code,
                        code1: tree1.code,
                        // isEqual: true,
                        simularty: 1 // They are the same
                    }
                    result.length++
                    break
                } else { // Use prettydiff
                    try {
                        prettydiff.options.diff = tree1.code
                        const prettyResult = JSON.parse(prettydiff())
                        prettyResult.diff.forEach(v => {
                            switch (v[0]) {
                            case '=':
                                equalsLines++
                            // eslint-disable-next-line no-fallthrough
                            case '+':
                            case 'r':
                                changedLine++
                                break
                            case '-':
                                changedLine--
                                break
                            }
                        })
                        if ((!samest || equalsLines / changedLine > samest.simularty) && equalsLines < changedLine) {
                            samest = {
                                simularTo: tree1.id,
                                simularty: equalsLines / changedLine,
                                code0: tree0.code,
                                code1: tree1.code
                            }
                        }
                    } catch (err) {
                        // console.warn(err)
                        samest = null
                    }
                    // console.log(prettyResult)
                }
            }
            if (!sameObj[tree0.id] && samest && samest.simularty > 0.8) {
                sameObj[tree0.id] = {
                    simularTo: samest.simularTo,
                    simularty: samest.simularty,
                    code0: samest.code0,
                    code1: samest.code1
                }
                result.length++
            }
            cur++
            progress({ text: `正在比对代码 (${cur}/${total})`, progress: 60 + ((cur / total) * 35) })
        }
        return result
    }
    const result = {}
    const codeTrees0 = await makeCodeTree(project0)
    const codeTrees1 = await makeCodeTree(project1)
    prettydiff.options.diff_format = 'json'
    result.code0length = codeTrees0.length
    result.code1length = codeTrees1.length
    result.code0 = await compareTree(codeTrees0, codeTrees1)
    result.code1 = await compareTree(codeTrees1, codeTrees0)
    // console.log(codeTrees0[0])
    return result
}

/**
 * Compare the same between two objects
 * @param {Object} o0 First object
 * @param {Array<any>} o1 Second object
 * @param {Hash} h0 Second object
 * @param {Object<string,Hash>} h1 Second object
 * @returns {Promise<{o0:number,o1:number,o0l:number,o1l:number}>} The result
*/
async function compareAssets ({ o0, o1, h0, h1, progress = () => {} }) {
    const result = {
        objectSameAmount0: 0,
        objectSameAmount1: 0,
        objectAmount0: 0,
        objectAmount1: 0,
        objectSame0: [],
        objectSame1: [],
        objectSameKey0: {},
        objectSameKey1: {}
    }

    for (const okey in o0) {
        const item = o0[okey]
        result.objectAmount0++
        if (ignoreMD5List.indexOf(item) !== -1) continue
        for (const key in o1) {
            await waitTick()
            const comp = o1[key]
            if (comp === item) {
                result.objectSame0.push(item)
                result.objectSameKey0[item] = okey
                result.objectSameAmount0++
                break
            }
        }
    }
    for (const okey in o1) {
        const item = o1[okey]
        result.objectAmount1++
        if (ignoreMD5List.indexOf(item) !== -1) continue
        for (const key in o0) {
            await waitTick()
            const comp = o0[key]
            if (comp === item) {
                result.objectSame1.push(item)
                result.objectSameKey1[item] = okey
                result.objectSameAmount1++
                break
            }
        }
    }
    return result
}

async function transferSb2IfNeed (proj) {
    const projJSON = JSON.parse(await proj.file('project.json').async('string'))
    if (projJSON.objName !== undefined) {
        const vm = new VisualMachine()
        await vm.loadProject(projJSON)
        proj.file('project.json', vm.toJSON())
        return jszip.loadAsync(vm.saveProjectSb3())
    }
}

/**
 * Compare two project, return a result object.
 * @param {Buffer|ArrayBuffer|String|Blob|ReadableStream} project0 The project to compare.
 * @param {Buffer|ArrayBuffer|String|Blob|ReadableStream} project1 The project to be compared.
 * @param {Function} progress A function which will be invoked while comparing, taking a progress message as an argument.
 * @returns {Promise<Object>} The result.
 */
async function compare (project0, project1, progress = () => {}) {
    progress({ text: '正在转换工程版本', progress: 0 })
    minilog.disable()
    const [zip0, zip1] = await Promise.all([jszip.loadAsync(project0), jszip.loadAsync(project1)])
    transferSb2IfNeed(zip0)
    transferSb2IfNeed(zip1)
    progress({ text: '正在打开', progress: 0 })
    const md50 = {}
    const md51 = {}
    const imgHash0 = {}
    const imgHash1 = {}
    const threads = []
    const result = {}
    let fileTotal = 0
    let fileLoaded = 0
    /**
     * Collect file hash from zip.
     * @param {jszip} zip The JSZip Object contains file.
     * @param {Array} array An array object stores hashes.
     */
    function collectHash (zip, array) {
        zip.forEach((rpath, file) => {
            if (rpath === 'project.json') return
            fileTotal++
            threads.push((async () => {
                const data = await file.async('uint8array')
                const hash = md5(data)
                if (ignoreMD5List.indexOf(hash) === -1) {
                    if (rpath.endsWith('.png')) {
                        array[rpath] = md5(data)
                    } else {
                        array[rpath] = md5(data)
                    }
                    await waitTick()
                }
                fileLoaded++
                progress({ text: `收集资源文件中 (${fileLoaded}/${fileTotal})`, progress: 5 + ((fileLoaded / fileTotal) * 30) })
                // }
            })())
        })
    }

    collectHash(zip0, md50, imgHash0)
    collectHash(zip1, md51, imgHash1)
    await Promise.all(threads)
    // console.log(md50, md51)
    progress({ text: '对比资源文件中', progress: 35 })
    result.assets = await compareAssets({ o0: md50, o1: md51, h0: imgHash0, h1: imgHash1, progress })
    progress({ text: '分析代码中', progress: 50 })
    const [projectJson0, projectJson1] = await Promise.all([
        (async () => JSON.parse(await zip0.file('project.json').async('string')))(),
        (async () => JSON.parse(await zip1.file('project.json').async('string')))()
    ])
    result.code = await compareCode(projectJson0, projectJson1, progress)
    progress({ text: '完成！', progress: 1 })
    return result
}

module.exports = compare
