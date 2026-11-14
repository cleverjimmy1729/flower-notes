花间 · 离线植物手记

使用：
打开上级文件夹中的“花间·植物手记.html”，建议使用 Chrome 或 Edge。
HTML 已内嵌全部图片、样式和程序，无需安装依赖或启动服务器。

功能：
选择或拖入植物照片；手动填写植物，或配置 DeepSeek / Pl@ntNet 后联网识别。
照片、植物名称、发现地点、坐标、日期、笔记保存在本机 IndexedDB。
按常见花期、植物种类与直线距离推荐已收录的上海赏花地点。
“我的手记”支持搜索、导出含照片的 JSON 备份及导入恢复。

注意：
清理浏览器数据、更换浏览器或移动 HTML 文件可能影响记录访问，请定期备份。
识别需要网络和自己的密钥；两个服务的密钥分别在页面内存保存，刷新后清除。
file:// 直连第三方接口可能受 CORS 限制，高级设置可填写支持跨域的兼容代理。
花期为季节参考，现场花况以园方消息为准；外部地图及资料链接需要联网。
没有在线部署，也不依赖托管服务。
.openai 文件仅保留先前创建的未发布项目标识。

DeepSeek 使用：
1. 点击左侧“识别接口”，选择 DeepSeek。
2. 填写 DeepSeek API Key，默认模型为支持图片的 deepseek-flash。
3. 默认接口：https://api.deepseek.com/chat/completions。
   也支持填写 https://api.deepseek.com 或 https://api.deepseek.com/v1，
   程序会自动补全 /chat/completions；兼容代理可填写完整请求地址。
4. 应用设置后上传照片，点击“识别这株植物”。
5. 核实候选名称、介绍及照片线索，再填写发现地点并保存。
DeepSeek 不显示模型自报的识别百分比；介绍与花期是模型推测。
保存与备份会保留简介、辨识特征、模型名称和识别服务，不会包含密钥。
只向识别服务发送所选照片，不发送发现地点与手记。
模型需支持图片输入；不支持图片、密钥无效、余额不足等情况会明确提示。
官方文档：https://api-docs.deepseek.com/guides/vision/

源文件：
offline/index.template.html：结构
offline/style.css：样式
offline/app.js：业务逻辑与内置地点、植物资料
offline/recognition.js：DeepSeek 与 Pl@ntNet 请求和响应适配
offline/assets：内嵌图片素材
offline/build.py：生成单文件 HTML
offline/test.mjs：核心规则验证

重建：python3 offline/build.py
检查：node offline/test.mjs
接口检查：node offline/recognition.test.mjs（全部使用模拟响应，不消耗额度）
