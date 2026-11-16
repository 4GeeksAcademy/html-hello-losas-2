# Maison Rive

这是一个为虚构法国时尚品牌制作的网店原型。项目使用 HTML 和 CSS，通过浏览器 CDN 引入 Tailwind CSS v4，不包含自定义客户端 JavaScript。Flask 通过标准 HTML 表单和服务器会话管理购物车。

## 页面

- `index.html`：首页。
- `catalogo.html`：包含 20 件商品，并提供按类别和尺码筛选的纯 CSS 功能。
- `producto.html`：通过 URL 片段选择的示例商品详情。
- `carrito.html`：当前会话购物车，可修改数量、删除商品并计算小计、增值税和总价。
- `checkout.html`：仅用于展示的结账页面，摘要会反映当前购物车。

商品页面可选择尺码和数量并添加到购物车。购物车保存在 Flask 签名会话 Cookie 中，服务器会验证商品选项和价格。结账仍仅用于展示：不会处理订单或支付，个人信息和银行卡字段仍处于禁用状态。请勿输入个人或支付信息。

## 本地运行

需要 Python 3 和 Flask：

```sh
python -m pip install flask
python server.py
```

打开 `http://127.0.0.1:3000`。非本地部署时，请通过 `FLASK_SECRET_KEY` 环境变量配置私有密钥。Tailwind CDN 需要互联网连接。

## 商品筛选兼容性

筛选使用 HTML 单选按钮和 CSS `:has()` 选择器。请使用支持 `:has()` 的现代浏览器。筛选状态不会保存在 URL 中，也不会显示动态结果数量。
