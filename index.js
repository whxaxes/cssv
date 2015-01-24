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

    var verIsAdd = program.add?true:(program.remove?false:true);
    var count = 0;

    cssvp.run = function () {
        var that = this;
        console.log("\n开始检索...\n")

        folders.forEach(function(f){
            that.replace(f)
        });

        console.log("检索完毕\n")

        if(!count)console.log("无需要修改的文件");
        else console.log("修改文件数："+count);
    };

    cssvp.replace = function(path){
        var str, that = this;

        try {
            str = fs.readFileSync(path).toString();
        } catch (e) {
            return;
        }

        var hasMatch = false;
        var logCollector = {};
        str = str.replace(urlReg, function (m) {
            var nstr = m.match(stripReg)[0];

            var link = url.resolve(path, nstr);
            var arr = link.split("/");

            var fileName = arr.pop();
            var prefix = arr.join("/");

            var fileArr = fileName.split(".");
            var fileType = fileArr[fileArr.length - 1];

            var result;
            switch (fileType){
                case "css":
                    result = that.cssReplace(nstr , link , fileName , fileType , prefix);
                    break;

                case "js":
                    if (program.all || program.javascript) result = that.getResult(nstr,m);
                    break;

                case "png" :
                case "gif":
                case "jpg":
                    if (program.all || program.image)result = that.getResult(nstr,m);
                    break;

                default : break;
            }

            if(result){
                hasMatch = true;
                logCollector[path] = logCollector[path] || [];
                logCollector[path].push("更改内容:" + m + " ====> " + result);

                if(program.cfname&&fileType=="css"){
                    return m.replace(stripReg, result);
                }else {
                    return m.charAt(0)+result+m.charAt(m.length-1)
                }
            }else return m;
        });

        if (hasMatch) {
            count++;
            console.log("\n-----------------------------------------");
            console.log("更改文件:" + path);
            console.log(logCollector[path].join("\n"));
            console.log("-----------------------------------------");

            fs.writeFileSync(path, str);
        }
    };

    //css替换
    cssvp.cssReplace = function(nstr , link , fileName , fileType , prefix){
        var that = this;
        if(program.cfname){
            var suffix = getMd5(prefix).substring(0, 5);
            var fileReg = new RegExp("((_" + suffix + ".*)|)\\." + fileType);

            var newFileName = fileName.replace(fileReg, "");
            var fnSuffix;

            if (!(link in cache_2)) {
                //文件版本号_MD5值+随机数+文件类型
                cache_2[link] = fnSuffix = verIsAdd ? ("_" + suffix + ~~(Math.random() * 10000) + "." + fileType) : ("." + fileType);
                that.replace(link);

                try{
                    fs.renameSync(link, prefix + "/" + newFileName + fnSuffix);
                }catch(e){
                    return null;
                }
            } else {
                fnSuffix = cache_2[link];
            }

            if(fileName.indexOf(suffix)==-1 && !verIsAdd) return null;

            return verIsAdd ? nstr.replace(fileReg, fnSuffix) : nstr.replace(fileReg, "." + fileType);
        }else {
            if (cache.indexOf(link) == -1) {
                cache.push(link);
                that.replace(link);
            }

            if (!program.all && !program.css && (program.javascript || program.image)) return null;

            return that.getResult(nstr,m);
        }
    };

    cssvp.getResult = function(str,m){
        if(m.indexOf("?")==-1 && !verIsAdd)return null;
        return verIsAdd ? (str + '?v=' + ~~(Math.random() * 100000)) : str;
    };

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
    function trim(str) {
        return str.replace(/(^\s*)|(\s*$)/g, "")
    }

    return new cssv();
})();