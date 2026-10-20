# Cả một vườn thương 🌹

Thiệp chúc mừng 20/10 dạng trang web: chạm vào bông hồng, cả khu vườn nở hoa, rồi một tấm thiệp hiện ra.

**Xem trang:** https://20020195.github.io/20_10/

## Sửa lời chúc

Mở `index.html`, tìm khối `<!-- Thiệp: sửa lời chúc ngay trong khối này -->` và thay nội dung trong `card-greet`, `card-title`, `card-body`, `card-sign`.

## Chạy thử trên máy

```bash
python -m http.server 8000
```

Rồi mở http://localhost:8000

## Cập nhật bản đã deploy

Trang được phục vụ bởi GitHub Pages từ nhánh `gh-pages`. Sau khi sửa và commit:

```bash
git push origin main main:gh-pages
```
