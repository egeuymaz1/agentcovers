# Poolsite

Bu klasor Vercel'e yuklenebilecek public agent showcase sitesidir.

## Dosya yapisi

- `index.html`: Sadece agent kartlarini gosteren sayfa iskeleti
- `styles.css`: Kart ve mobil scroll tasarimi
- `app.js`: Kartlari yukler ve videolari gorunur oldukca oynatir
- `covers/`: Orijinal `covers` klasorunun kopyasi
- `manifest.js`: Build sirasinda otomatik uretilen dosya listesi
- `package.json`: Vercel build komutu
- `vercel.json`: Vercel ayarlari
- `scripts/build-manifest.ps1`: `covers` klasorunden `manifest.js` uretir
- `scripts/build-manifest.mjs`: Vercel/Linux uyumlu manifest uretir

## Yeni agent ekleme

Yeni bir agent eklemek icin `poolsite/covers` icine yeni bir klasor acin ve icine `.mp4`, `.webm`, `.mov`, `.jpg`, `.png`, `.webp` veya `.gif` dosyasi koyun.

GitHub'a push ettiginizde Vercel otomatik deploy alir ve `npm run build` calisir. Bu build, `covers` klasorunu tarayip `manifest.js` dosyasini yeniden uretir. Boylece yeni klasor kart olarak otomatik cikar.

Lokal olarak manifest'i yenilemek isterseniz:

```powershell
npm run build
```

Yeni medya ekledikten sonra videolari/gorselleri web icin kucultmek isterseniz:

```powershell
npm run optimize
npm run build
```

PowerShell script'i de duruyor:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-manifest.ps1
```

## Vercel kurulumu

1. Bu klasoru bir GitHub repo'ya yukleyin.
2. Vercel'de yeni proje olusturun.
3. Build command `npm run build` olsun.
4. Output directory `.` olsun.
5. Deploy edin.

Showcase masaustunde bir sirada 4 agent karti gosterir. Ekran daraldikca 3, 2 ve 1 kolona duser. Medyalar kart icinde 1:1 kare olarak gosterilir.
