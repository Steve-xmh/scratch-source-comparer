'use strict'
// codeComparer - 比对代码！
require('colors')
const readline = require('readline')
const summary = require('./summary')

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
    toFormatedString () {
        let ret = `${this.opcode}()`
        if (this.topLevel) ret += '{'
        if (this.next) {
            ret += `${this.next.toFormatedString()}`
        }
        if (this.inputs.SUBSTACK) {
            ret += `{${this.inputs.SUBSTACK[1].toFormatedString()}}`
        }
        if (this.inputs.SUBSTACK2) {
            ret += `else{${this.inputs.SUBSTACK2[1].toFormatedString()}}`
        }
        if (this.topLevel) ret += '}'
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

function compare (project0, project1, reports = []) {
    const report = (str) => { reports.push(str) }
    return new Promise((resolve, reject) => {
        try {
            console.log('(0/3)正在扫描源代码……'.yellow)
            const scObj0 = project0.targets
            const scObj1 = project1.targets
            const proj0Codes = []
            const proj1Codes = []
            console.log('(1/3)正在扫描原作品源代码……'.yellow)
            for (const sKey in scObj0) {
                for (const bKey in scObj0[sKey].blocks) {
                    if (scObj0[sKey].blocks[bKey].topLevel) {
                        readline.clearLine(process.stdout)
                        process.stdout.write(`\r${'识别到顶级模块：'.yellow}${scObj0[sKey].blocks[bKey].opcode}`)
                        const b = fixBlock(scObj0[sKey].blocks[bKey], scObj0[sKey].blocks)
                        proj0Codes.push({ b, sprite: scObj0[sKey].name, x: scObj0[sKey].blocks[bKey].x, y: scObj0[sKey].blocks[bKey].y })
                    }
                }
            }
            readline.clearLine(process.stdout)
            console.log('\r(2/3)正在扫描被比较作品源代码……'.yellow)
            for (const sKey in scObj1) {
                for (const bKey in scObj1[sKey].blocks) {
                    if (scObj1[sKey].blocks[bKey].topLevel) {
                        readline.clearLine(process.stdout)
                        process.stdout.write(`\r${'识别到顶级模块：'.yellow}${scObj1[sKey].blocks[bKey].opcode}`)
                        const b = fixBlock(scObj1[sKey].blocks[bKey], scObj1[sKey].blocks)
                        proj1Codes.push({ b, sprite: scObj1[sKey].name, x: scObj1[sKey].blocks[bKey].x, y: scObj1[sKey].blocks[bKey].y })
                    }
                }
            }
            readline.clearLine(process.stdout)
            process.stdout.write('\r扫描完毕！\n'.green)
            console.log('(3/3)正在比较作品相似度……'.yellow)

            let same0 = 0
            let same1 = 0
            const sameTopBlockTree0 = {}
            const sameTopBlockTree1 = {}
            const total0 = proj0Codes.length
            const total1 = proj1Codes.length

            function addSameTopBlock (tree, code) {
                tree[code.sprite] = tree[code.sprite] || []
                tree[code.sprite].push({ x: code.x, y: code.y })
            }

            for (let i = 0; i < proj0Codes.length; i++) {
                for (let k = 0; k < proj1Codes.length; k++) {
                    if (proj0Codes[i].b.toFormatedString() == proj1Codes[k].b.toFormatedString()) {
                        same0++
                        readline.clearLine(process.stdout)
                        addSameTopBlock(sameTopBlockTree0, proj0Codes[i])
                        process.stdout.write(`\r(1/2)正在扫描原工程代码相似度(${i + 1}/${total0})(${same0})`)
                        break
                    }
                }
            }

            for (let i = 0; i < proj1Codes.length; i++) {
                for (let k = 0; k < proj0Codes.length; k++) {
                    if (proj1Codes[i].b.toFormatedString() == proj0Codes[k].b.toFormatedString()) {
                        same1++
                        readline.clearLine(process.stdout)
                        addSameTopBlock(sameTopBlockTree1, proj1Codes[i])
                        process.stdout.write(`\r(2/2)正在扫描原工程代码相似度(${i + 1}/${total1})(${same1})`)
                        break
                    }
                }
            }

            readline.clearLine(process.stdout)
            process.stdout.write('\r比对完成！'.green)

            reports.push('--------------------源码比对报告--------------------'.blue)

            reports.push('原工程顶级代码结构数量：\t\t' + (total0.toString()).yellow)
            reports.push('被比较工程顶级代码结构数量：\t\t' + (total1.toString()).yellow)
            reports.push('原工程顶级代码结构一致数量：\t\t' + (same0.toString()).yellow)
            reports.push('被比较工程顶级代码结构一致数量：\t' + (same1.toString()).yellow)
            reports.push('')
            reports.push('被比较工程代码结构一致占原作比：\t' + `${((same1 / total0 * 100).toFixed(2))}%`.yellow)
            reports.push('原工程代码结构一致占自身比：\t\t' + `${((same0 / total1 * 100).toFixed(2))}%`.yellow)
            reports.push('总结：\t\t\t\t\t' + summary(((same1 / total0 * 100).toFixed(2))))

            reports.push('----------------------------------------------------'.blue)

            reports.push('--------------------源码相似清单--------------------'.blue)
            reports.push('-- 原工程'.blue)
            for (const key in sameTopBlockTree0) {
                reports.push('    在角色 '.blue + key + ' 中:'.blue)
                for (const block of sameTopBlockTree0[key]) {
                    reports.push('       头部模块位置: '.blue + `X=${block.x} Y=${block.y}`)
                }
            }
            reports.push('---- 被比较工程'.blue)
            for (const key in sameTopBlockTree1) {
                reports.push('    在角色 '.blue + key + ' 中:'.blue)
                for (const block of sameTopBlockTree1[key]) {
                    reports.push('       头部模块位置: '.blue + `X=${block.x} Y=${block.y}`)
                }
            }
            reports.push('----------------------------------------------------'.blue)

            resolve(reports)
        } catch (err) {
            reject(err)
        }
    })
}

module.exports = compare
