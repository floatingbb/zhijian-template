# 内容与外部服务说明

## 默认内容

`public/seed.json` 附带12则示例。古典原文来自相应篇目的维基文库页面；每则保留作者、篇名和直接出处链接。宋代点茶知识参考香港古物古迹办事处“茶盏里的风波”展览说明，白话与阅读札记由本项目自行组织。

古典原文的权利状态以对应作品和司法辖区为准。维基文库网站整体的许可不意味着每一部分都采用同一种许可；请查看原文页面。本站不复制其现代赏析、编辑注释和图片作为自己的内容。

## 自动抓取

程序使用维基文库的MediaWiki API，只获取公开页面；不使用作者的个人账户或访问令牌。

- 分类接口：https://www.mediawiki.org/wiki/API:Categorymembers
- 原典解析：https://www.mediawiki.org/wiki/API:Parsing_wikitext

请遵守来源站点条款和访问规范，不要把默认抓取频率改成大规模采集。

## AI 服务

通过使用者配置的HTTPS Chat Completions地址调用。兼容接口参考供应商官方文档，例如：

- https://api-docs.deepseek.com/api/create-chat-completion/

项目与任何AI供应商没有隶属或担保关系。生成内容可能有误；引文比对只能验证文字片段，不能证明作者归属、历史情节和解读完全可靠。

## 运行环境

Node.js：https://nodejs.org/
GitHub模板：https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository

程序没有第三方Node运行依赖。Docker基础镜像、Node.js和GitHub Actions各自受其许可证、条款及服务限制约束。
