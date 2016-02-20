# 技术与源代码 #

> 您只需要熟悉html, javascript编程即可；如果懂得css, html5或是精通Ajax则更好。

> 源代码在本工程的svn中，我用MyEclipse编写，因此有.project之类的工程文件，如果不用Eclipse直接忽略即可，无关紧要。

> 开发环境：顺手的文本编辑器  + chrome浏览器 + 支持SVN的工具

# 源代码目录结构 #

> js: 存放所有javascript文件

> images: 存放所有图片

> _locales：存放多语言翻译资料，目前已经翻译了中英日。_

> 其他为chrome设定。

# 如何开始 #

> 假设您要新增加对一个网站的支持，步骤如下：

  1. 分析要支持的网站，看通过何种URL地址，可以获取到提醒消息的个数；

> 2. 修改js/checker.js（或者另外做个js，在background.html中引用）。每个网站的代码我都用=========xxxx=====做了分割，找一个类似的，复制一份。修改Checker的名字 和 其中的方法。

> 3. 基本来说，checker.js 就是定时的发送XmlHttpRequest到网站，获取信息，解析出新消息数，然后通过updateUnreadCount 构造统一的格式，传给 globalNotifyUnreadMessage 做显示。

> 4. 如果你熟悉OOP，checker.js 有点多态的味道；新加一个网站就是新加一个checker，重写其中的方法。

> 5. 完成checker.js后，修改backgroud.html#startChoseCheckers 方法，为网站取个唯一的名字（短的英文缩写），在startChoseCheckers中加上启动新写checker的判断。

> 6. 修改options.html， 把新的checker名字放到选项里，让用户可以选择。注意所有相关的图片，必须存储到本地的images下面，不要用绝对地址引用原网站的，这会降低弹出框的响应。

> 7. Chrome右上的工具按钮 -> 工具 -> 扩展程序 -> 载入正在开发的扩展程序.. -> 选择NotifyAll的目录 ，启动啦。

> 8. 如果没有错误，到插件的 设置 中勾上新写的网站，试试看吧。如果有错，用Chrome调试也很方便。

# 程序内部保存待提醒消息的格式 #

> 不好意思，只有纸上的一张图，如果有需要我在做正常点的：

> ![http://notifyall.googlecode.com/svn/wiki/raw/dev/protocal_in_paper.jpg](http://notifyall.googlecode.com/svn/wiki/raw/dev/protocal_in_paper.jpg)

## 有问题 ##

> QQ: 710569477

> 新浪微博：http://t.sina.com.cn/guzzframework



