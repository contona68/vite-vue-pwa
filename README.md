# هایپریک — Vite + Vue 3 + PWA

## اجرای محلی

```bash
npm run dev
npm run mobile
```

## انتشار روی GitHub Pages (تست موبایل با HTTPS)

1. ریپوی GitHub بساز با اسم مثلاً `vite-vue-pwa`
2. اگر اسم ریپو فرق دارد، در `.github/workflows/deploy-pages.yml` مقدار `VITE_BASE_PATH` را به `/اسم-ریپو/` عوض کن
3. کد را push کن روی `main`
4. در GitHub برو به:
   **Settings → Pages → Build and deployment → Source: GitHub Actions**
5. بعد از سبز شدن workflow، سایت اینجاست:

`https://USERNAME.github.io/vite-vue-pwa/login`

روی گوشی همین لینک را باز کن — HTTPS واقعی است و بنر نصب / PWA باید کار کند.

### بیلد دستی برای Pages

```bash
# Windows PowerShell
$env:VITE_BASE_PATH="/vite-vue-pwa/"; npm run build:gh
```
