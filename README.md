#CSSV:给html文件里的链接添加版本号

###使用方法:
安装:npm install cssv -g

1、打开要添加版本号的项目目录<br>
2、打开当前目录下的控制台，输入cssv -a回车即可给当前目录下的所有html文件里的css链接添加版本号<br>
3、输入cssv -r则可以移除所有css链接的版本号<br>

还有其他命令：
cssv -a  不带其他命令默认只添加css的版本号<br>
cssv -a -c|-i|-j  添加css或image或js链接的版本号<br>
cssv -a -A 三个文件都添加版本号<br>

cssv -a -C    由于考虑到chrome的workspace不能识别带后缀名的css链接，所以加了-C命令，这个命令不是添加?v=XX的版本号，而是直接更改css文件名，同时更新html上的链接。这样就可以更改版本号以后继续使用workspace了

-r同上


