const chalk = require('chalk')

const summaryList = [
    [0.01, 'Completely different', chalk.gray],
    [0.1, 'A little same', chalk.cyan],
    [0.2, 'A few same', chalk.green],
    [0.5, 'Something same', chalk.yellow],
    [0.8, 'A lot of same', chalk.red],
    [1, 'Very same', chalk.bgYellow.red],
    [0, 'They are the same', chalk.bgRed.white],
    [0, 'Something is wrong', chalk.bgWhite.black]
]

module.exports = (num, color = false) => {
    for (let i = 0; i < 6; i++) {
        if (num < summaryList[i][0]) {
            return color ? summaryList[i][2](summaryList[i][1]) : summaryList[i][1]
        }
    }
    if (num >= 1) {
        return color ? summaryList[6][2](summaryList[6][1]) : summaryList[6][1]
    } else {
        return color ? summaryList[7][2](summaryList[7][1]) : summaryList[7][1]
    }
}
