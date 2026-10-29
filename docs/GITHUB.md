# 第一次把纸间分享到 GitHub

这份指南适用于没有用过 GitHub 的人。不要上传你的自用网站完整目录；只上传本模板文件。

## 1. 注册或登录

打开 https://github.com ，注册自己的账号，完成邮箱验证。账号注册、验证码与服务条款需要你本人完成。

## 2. 创建私有仓库

点右上角 **＋ → New repository**。

- 名称建议：`zhijian-template`。
- 描述：`纸间：自带密钥的诗词、古文与历史短读模板`。
- **Visibility 选择 Private**：先只有你和明确邀请的协作者能看。
- 本地已有完整 README 和 LICENSE 时，不用重复勾选初始化选项。
- 点 **Create repository**。

## 3. 上传模板文件

若由助手连接 GitHub 帮你上传，可跳过手动上传。若手动操作：

1. 解压提供的模板 ZIP。
2. 在仓库点 **uploading an existing file**，或 **Add file → Upload files**。
3. 打开解压目录，把其中的文件和文件夹拖入上传区。仓库根目录应直接出现 `README.md`、`package.json`、`public/`、`src/` 等；不要再套一层同名目录。
4. 注意 `.gitignore`、`.env.example`、`.dockerignore`、`.github/` 也需要上传；有些系统默认隐藏点开头的文件。
5. 提交说明填“添加纸间独立模板”，点 **Commit changes**。

**ZIP用于传送项目。只把ZIP作为一个文件上传到仓库，不会自动展开成可用源码。**

## 4. 检查与打开模板功能

打开 **Actions**，查看 `Check template` 的检查结果。程序的检查不使用你的真实AI密钥。

在 **Settings → General** 中勾选 **Template repository**。别人以后就能用 **Use this template** 建立自己的独立项目。

## 5. 公开分享

检查根目录和提交历史里没有 `.env`、`data/`、备份、私人网址和密钥后，再决定是否公开：

**Settings → General → Danger Zone → Change repository visibility → Public**。

公开后，任何人可能下载、复制和长期保留这份源码。把仓库再改回私有，并不能收回别人已经下载的副本。

分享的是仓库地址，例如 `https://github.com/你的用户名/zhijian-template`，而不是你的自用网站地址。

## 6. 仓库私有与网站私有是两种设置

- 仓库可见性决定谁能看代码。
- 部署后的访问密码决定谁能访问你的个人阅读库。
- 即使模板源码公开，每个使用者的密码、密钥、内容与阅读记录仍应保留在自己的部署环境中。
- GitHub token用来操作代码仓库；AI API Key用来调用模型，不能混用。

## 官方帮助

- 创建模板：https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository
- 从模板建立项目：https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template
- 处理敏感信息泄露：https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
