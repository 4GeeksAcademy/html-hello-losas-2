# Maison Rive

这是一个为虚构法国时尚品牌制作的静态网店原型。项目使用 HTML 和 CSS，通过浏览器 CDN 引入 Tailwind CSS v4，不包含自定义应用 JavaScript。

## 页面

- `index.html`：首页。
- `catalogo.html`：包含 20 件商品，并提供按类别和尺码筛选的纯 CSS 功能。
- `producto.html`：通过 URL 片段选择的示例商品详情。
- `carrito.html`：示例购物车。
- `checkout.html`：示例结账页面。

商品、购物车和结账页面仅用于演示。账户、搜索、购物车更新、订单和支付功能均未实现。结账字段和购买控件已禁用；请勿输入个人或支付信息。

## 本地运行

需要 Python 3 和 Flask：

```sh
python -m pip install flask
python server.py
```

打开 Flask 显示的本地地址（通常为 `http://127.0.0.1:5000`）。Tailwind CDN 需要互联网连接。

## 商品筛选兼容性

筛选使用 HTML 单选按钮和 CSS `:has()` 选择器。请使用支持 `:has()` 的现代浏览器。筛选状态不会保存在 URL 中，也不会显示动态结果数量。
