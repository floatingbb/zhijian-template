# 网页字体来源与修改说明

随站点提供的两份WOFF2是精简、重命名后的衍生字库，并非原版桌面字体。

- Zhijian Reader Wen：基于LXGW WenKai Lite Regular（霞鹜文楷轻便版），上游 https://github.com/lxgw/LxgwWenKai-Lite 。许可证见font-wen-OFL.txt。
- Zhijian Reader Song：基于ZCOOL XiaoWei Regular（站酷小薇），上游 https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei 。许可证见font-song-OFL.txt。

两者均依SIL Open Font License 1.1分发，保留上游版权和许可证。修改包括GB2312常用字、公开默认示例用字及标点子集化，转换WOFF2，并将字体内部家族名改为上述新名称，避免使用上游保留字体名命名衍生文件。少量不在子集内的生僻字会使用设备字体。网页所示中文名称用于说明字体来源。代码MIT许可不替代字体自身OFL许可。

## 新增传统宋体

Zhijian Reader Classic基于Noto Serif CJK SC Regular，来源 https://github.com/notofonts/noto-cjk/tree/main/Serif ，依SIL Open Font License 1.1分发，完整许可证见font-classic-OFL.txt。衍生修改：GB2312常用字、公开默认示例用字和标点子集化；转换为WOFF2；字体家族名和CFF内部名称均改为Zhijian Reader Classic，保留原版权与许可。少量生僻字仍会回退设备字体。该字体不采用代码的MIT许可。
