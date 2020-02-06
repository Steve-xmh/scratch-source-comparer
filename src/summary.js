module.exports = (num) => {
	if (num < 1) return "毫无抄袭".grey;
	else if (num < 10) return "稍微抄袭".cyan;
	else if (num < 20) return "轻度抄袭".green;
	else if (num < 50) return "普通抄袭".yellow;
	else if (num < 80) return "重度抄袭".red;
	else if (num < 100) return "几乎照搬".red;
	else if (num >= 100) return "完全一致".bgRed.white;
	else return "出问题了".bgWhite.bgBlack;
}