"use strict";

const fs = require("fs");
const jszip = require("jszip");
require("colors");
const crypto = require("crypto");
const codeComparer = require("./codeComparer");
const readline = require("readline");
const summary = require("./summary");

let finalReports = [];

console.log("");
console.log("    Scratch Source Comparer v1.1.0".blue);
console.log("");

// 在本列表中加入的 MD5 将在对比时忽略
const ignoreMD5List = [
	"83a9787d4cb6f3b7632b4ddfebf74367",
	"83c36d806dc92327b9e7049a565c6bff",
	"cd21514d0531fdffb22204e0ec5ed84a",
	"b7853f557e4426412e64bb3da6531a99",
	"e6ddc55a6ddd9cc9d84fe0b4c21e016f",
	""
]

const f0 = process.argv.slice(2)[0];
const f1 = process.argv.slice(2)[1];

let file0 = undefined;
let file1 = undefined;

if (!f0 || !f1) {
	console.log("用法：node scSourceComparer.js (原工程路径) (被比较工程路径)".yellow);
	return;
}

console.log("原工程：" + f0);
console.log("被比较工程：" + f1);

if (!fs.existsSync(f0)) {
	console.error("错误：原工程路径不存在！")
	return;
}

if (!fs.existsSync(f1)) {
	console.error("错误：被比较工程路径不存在！")
	return;
}

try {
	file0 = fs.readFileSync(f0);
	file1 = fs.readFileSync(f1);
} catch (err) {
	console.error("错误：打开文件失败：" + err);
	return;
}

let files0 = 0;
let filesLoaded0 = 0;
let files1 = 0;
let filesLoaded1 = 0;

let md50 = {};
let md51 = {};

let comparing = false
function compareResources(md50 = {}, md51 = {}, finalReports = []) {
	return new Promise((resolve, reject) => {
		try {
			if (comparing) reject();
			comparing = true;
			readline.clearLine(process.stdout);
			console.log("\r正在对比素材 MD5...".green);
			console.log("正在扫描原工程素材……\n".green);
			for (let path0 in md50) {
				readline.clearLine(process.stdout);
				process.stdout.write("\r" + path0 + " : " + md50[path0]);
			}
			readline.clearLine(process.stdout);
			console.log("\r正在扫描被比较工程素材……\n".green);
			let sames = 0;
			for (let path1 in md51) {
				readline.clearLine(process.stdout);
				process.stdout.write("\r" + path1 + " : " + md51[path1]);
				if (ignoreMD5List.indexOf(md51[path1]) == -1) {
					let areSame = false;
					for (let path10 in md50) {
						if (md50[path10] == md51[path1]) {
							sames++;
							areSame = true;
							break;
						}
					}
					if (areSame) {
						process.stdout.write(" [一致]".red);
					} else {
						process.stdout.write(" [不一致]".green);
					}
				} else {
					process.stdout.write(" [忽略]".gray);
				}
			}
			finalReports.push("--------------------素材比对报告--------------------".blue);
			finalReports.push("原工程：\t\t" + f0.yellow);
			finalReports.push("被比较工程：\t\t" + f1.yellow);
			finalReports.push("");
			finalReports.push("原工程素材总数：\t" + filesLoaded0.toString().yellow);
			finalReports.push("被比较工程素材总数：\t" + filesLoaded1.toString().yellow);
			finalReports.push("素材一致数量：\t\t" + sames.toString().yellow);
			finalReports.push("");
			finalReports.push("一致素材占原作比：\t" + (sames / filesLoaded0 * 100).toFixed(2).yellow + "%".yellow);
			finalReports.push("一致素材占自身比：\t" + (sames / filesLoaded1 * 100).toFixed(2).yellow + "%".yellow);
			finalReports.push("总结：\t\t\t" + summary(sames / filesLoaded0 * 100))
			finalReports.push("----------------------------------------------------".blue);
			readline.clearLine(process.stdout);
			console.log("\r资源检查完毕！".green);
			resolve();
		} catch (err) {
			console.log(`分析资源文件时发生错误：${err}`.red);
			reject(err);
		}
	})
}

function outputReports()
{
	console.log();
	finalReports.forEach((val)=>{console.log(val)});
}

let zip0 = new jszip();
let zip1 = new jszip();
let data0 = null;
let data1 = null;
let project0 = null;
let project1 = null;

zip0.loadAsync(file0)
	.then((data) => {
		data0 = data;
		data.forEach((path, file) => {
			files0++;
			readline.clearLine(process.stdout);
			if (file.name == "project.json") {
				process.stdout.write("\r被比较工程发现工程文件：" + path);
				file.async("string")
					.then((value) => {
						project0 = JSON.parse(value);
						filesLoaded0++;
						if (files0 == filesLoaded0 && files1 == filesLoaded1) compareResources(md50, md51, finalReports).then(() => { codeComparer(project0, project1, finalReports).then(() => { outputReports() }) }).catch(() => { });
					});
			} else {
				process.stdout.write("\r原工程发现文件：" + path);
				file.async("uint8array")
					.then((value) => {
						md50[path] = crypto.createHash("md5").update(value).digest("hex");
						filesLoaded0++;
						readline.clearLine(process.stdout);
						process.stdout.write("\r原工程读取文件：" + path);
						if (files0 == filesLoaded0 && files1 == filesLoaded1) compareResources(md50, md51, finalReports).then(() => { codeComparer(project0, project1, finalReports).then(() => { outputReports() }) }).catch(() => { });
						// console.log(files0,filesLoaded0,files1,filesLoaded1);
					}, (err) => {
						console.error("错误：原工程子文件读取失败：" + err);
					});
			}
		});
	}, (err) => {
		console.error("错误：无法打开原工程：" + err);
	});

zip1.loadAsync(file1)
	.then((data) => {
		data1 = data;
		data.forEach((path, file) => {
			files1++;
			readline.clearLine(process.stdout);
			if (file.name == "project.json") {
				process.stdout.write("\r被比较工程发现工程文件：" + path);
				file.async("string")
					.then((value) => {
						project1 = JSON.parse(value);
						filesLoaded1++;
						if (files1 == filesLoaded1 && files0 == filesLoaded0) compareResources(md50, md51, finalReports).then(() => { codeComparer(project0, project1, finalReports).then(() => { outputReports() }) }).catch(() => { });
					});
			} else {
				process.stdout.write("\r被比较工程发现文件：" + path);
				file.async("uint8array")
					.then((value) => {
						md51[path] = crypto.createHash("md5").update(value).digest("hex");
						filesLoaded1++;
						readline.clearLine(process.stdout);
						process.stdout.write("\r被比较工程读取文件：" + path);
						// console.log(files0,filesLoaded0,files1,filesLoaded1);
						if (files1 == filesLoaded1 && files0 == filesLoaded0) compareResources(md50, md51, finalReports).then(() => { codeComparer(project0, project1, finalReports).then(() => { outputReports() }) }).catch(() => { });
					}, (err) => {
						console.error("错误：被比较工程子文件读取失败：" + err);
					});
			}
		});
	}, (err) => {
		console.error("错误：无法打开被比较工程：" + err);
	});


