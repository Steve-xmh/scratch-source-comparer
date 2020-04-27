const isNode = !(typeof window !== 'undefined' && window !== null)
const md5 = data => isNode ? require('crypto').createHash('md5').update(data).digest('hex') : require('md5')(data)

/**
 * @template T
 * @param {Generator<T>} g
 * @returns {T}
 */
function genArray (g) {
    const result = []
    for (const item of g) {
        result.push(item)
    }
    return result
}

class Winnowing {
    /**
     * 创建一个字符串指纹算法对象
     * @param {number} k 字符串分组长度
     * @param {number} w 窗口长度
     */
    constructor (k = 5, w = 10) {
        this.k = k
        this.w = w
        this.str = ''
    }

    /**
     * 计算字符串，并取其中一段作为数字传回
     * @param {string} str 需要计算的字符串
     * @private
     */
    _hash (str) {
        return parseInt(md5(str).substr(0, 8), 16)
    }

    /**
     * 对数组或字符串进行 k-grams 分组
     * @template T[]
     * @param {T[]} l 需要计算的数组
     * @param {number} size 分组大小
     * @yields {T}
     * @generator
     * @private
     */
    * _kgrams (l, size) {
        const n = l.length
        if (n < size) {
            yield l
        } else {
            for (let i = 0; i < n - size + 1; i++) {
                yield l.slice(i, i + size)
            }
        }
    }

    /**
     * 计算字符串，返回一个指纹字符串
     * @param {string} str 需要计算的字符串
     */
    fingerprint (str) {
        let minNum = Number.MAX_SAFE_INTEGER
        const result = []
        const kstr = genArray(this._kgrams(str, this.k)).map(this._hash)
        for (const item of this._kgrams(kstr, this.w)) {
            minNum = item[0]
            for (const i of item) {
                if (minNum < i) {
                    minNum = i
                }
            }
            result.push(minNum)
        }
        return result
    }
}

module.exports = Winnowing
