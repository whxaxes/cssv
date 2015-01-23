var fs = require('fs');
var url = require('url');
var crypto = require("crypto");
var program = require('commander');

var urlReg = /("|'|\()(((\.)|(\.\.)|(http:)|([-_a-zA-Z0-9.]*))\/)*[-_a-zA-Z0-9.]*\.(css|js|png|jpg|gif)[?=0-9a-zA-Z]*("|'|\))/g;  //匹配"**/*.css?v=*"
var stripReg = /(((\.)|(\.\.)|(http:)|([-_a-zA-Z0-9.]*))\/)*[-_a-zA-Z0-9.]*\.(css|js|png|jpg|gif)/i;   //匹配"**/*.css?v=*"中的**/*.css
var htmlReg = /.+\.(html|ejs|jade)/g;

var DIRECTORY = "./";

program.version("1.0.4")
    .option('-a,--add', 'add version')
    .option('-r,--remove', 'remove version')
    .option('-c,--css', 'add css version')
    .option('-i,--image', 'add image version')
    .option('-j,--javascript', 'add javascript version')
    .option('-A,--all', 'add css,js,image version')
    .option('-C,--cfname', "change css file name")
    .parse(process.argv);

module.exports = (function () {
    var folders = getAllFolder(DIRECTORY);
    var cache = [];
    var cache_2 = {};

    var cssv = function () {};
    var cssvp = cssv.prototype;

    cssvp.logs = {};

    cssvp.run = function () {
        for (var i = 0; i < folders.length; i++) {
            var folder = folders[i];

            if (program.add) {
                if (program.cfname) this.dealFileName(folder, true);
                else this.dealFile(folder, function (str) {
                    return str + '?v=' + ~~(Math.random() * 100000);
                });
            } else if (program.remove) {
                if (program.cfname) this.dealFileName(folder, false);
                else this.dealFile(folder, function (str) {
                    return str;
                });
            }
        }
    };

    //添加版本号方法1，添加后缀v=XXX
    cssvp.dealFile = function (path, callback) {
        var str, that = this;

        try {
            str = fs.readFileSync(path).toString();
        } catch (e) {
            return;
        }

        var isMatch = false;
        var logCollector = {};
        str = str.replace(urlReg, function (m) {
            var nstr = m.match(stripReg)[0];

            if (nstr.indexOf(".css") >= 0) {
                var csslink = url.resolve(path, nstr);

                if (cache.indexOf(csslink) == -1) {
                    cache.push(csslink);
                    that.dealFile(csslink, callback)
                }

                if (!program.all && !program.css && (program.javascript || program.image)) return m;

            } else if (nstr.indexOf(".js") >= 0) {
                if (!program.all && !program.javascript) return m;
            } else if (!program.all && !program.image) {
                return m;
            }

            var result = typeof callback == "function" ? callback.call(this, nstr) : null;

            if (!result)return m;

            isMatch = true;

            logCollector[path] = logCollector[path] || [];
            logCollector[path].push("更改内容:" + m + " ====> " + result)

            return m.charAt(0)+result+m.charAt(m.length-1);
        });

        if (isMatch) {
            console.log("\n-----------------------------------------");
            console.log("更改文件:" + path);
            console.log(logCollector[path].join("\n"));
            console.log("-----------------------------------------");

            fs.writeFileSync(path, str);
        }
    }

    //添加版本号方法2，修改文件名
    cssvp.dealFileName = function (path, isAdd) {
        var str, that = this;

        try {
            str = fs.readFileSync(path).toString();
        } catch (e) {
            return;
        }

        var isMatch = false;
        var logCollector = {};
        str = str.replace(urlReg, function (m) {
            var nstr = m.match(stripReg)[0];

            var link = url.resolve(path, nstr);
            var arr = link.split("/");
            var hasDivide = link.indexOf("/") >= 0;
            var fileName = hasDivide ? arr.pop() : link;
            var fileType = fileName.split(".")[fileName.split(".").length - 1];
            var prefix = hasDivide ? arr.join("/") : "";
            var result = "";

            if (fileType == 'css') {
                try{
                    var suffix = getMd5(prefix).substring(0, 5);
                    var fileReg = new RegExp("((_" + suffix + ".*)|)\\." + fileType);
                    fileName = fileName.replace(fileReg, "");

                    if (!(link in cache_2)) {
                        var cssname = isAdd ? ("_" + suffix + ~~(Math.random() * 10000) + "." + fileType) : ("." + fileType);

                        cache_2[link] = cssname;

                        var newlink = prefix + "/" + fileName + cssname;
                        fs.renameSync(link, newlink);

                        that.dealFileName(newlink, isAdd);

                        result = isAdd ? nstr.replace(fileReg, cssname) : nstr.replace(fileReg, "." + fileType);
                    } else {
                        result = isAdd ? nstr.replace(fileReg, cache_2[link]) : nstr.replace(fileReg, "." + fileType);
                    }
                    isMatch = true;
                }catch(e){
                    return m;
                }
            }else {
                return m;
            }

            logCollector[path] = logCollector[path] || [];
            logCollector[path].push("更改内容:" + m + " ====> " + result)

            return m.replace(stripReg, result);;
        });

        if (isMatch) {
            console.log("\n-----------------------------------------")
            console.log("更改文件:" + path);
            console.log(logCollector[path].join("\n"));
            console.log("-----------------------------------------")

            fs.writeFileSync(path, str);
        }
    }

    //获取MD5加密字符串
    function getMd5(str) {
        return crypto.createHash("md5").update(str).digest("hex");
    }

    //获取当前目录下的所有文件
    function getAllFolder(folderPath) {
        folderPath = trim(folderPath);

        var isDir = fs.lstatSync(folderPath).isDirectory();

        if (!isDir) {
            return [folderPath]
        }

        var arr = [];
        dealPath(folderPath);
        return arr;

        function dealPath(p) {
            var files = fs.readdirSync(p);

            for (var i = 0; i < files.length; i++) {
                p = trim(p);
                p += p.charAt(p.length - 1) == "/" ? "" : "/";

                var status = fs.lstatSync(p + files[i]);

                if (status.isDirectory()) {
                    if (files[i].charAt(0) == ".")continue;

                    dealPath(p + files[i] + "/");
                } else {
                    if (!files[i].match(htmlReg))continue;
                    arr.push(p + files[i])
                }
            }
        }
    }

    //去头尾空格
    function trim(msg) {
        return msg.replace(/(^\s*)|(\s*$)/g, "")
    }

    return new cssv();
})();