# XASİLKAN AJAN

Yapay zeka ile **uygulama üret**, **sohbet et** ve **görsel oluştur**. Next.js +
PostgreSQL (Drizzle ORM) ile yapılmış, kurulabilir bir PWA.

---

## 🚀 GitHub'a atıp Vercel'de yayınlama (adım adım)

### 1) Kodu GitHub'a yükle
1. https://github.com/new adresinden yeni bir repo aç (örn. `xasilkan-ajan`), **Private** seçebilirsin.
2. Bilgisayarında proje klasöründe terminal aç ve şunları çalıştır:
   ```bash
   git init
   git add .
   git commit -m "İlk sürüm: XASİLKAN AJAN"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADIN/xasilkan-ajan.git
   git push -u origin main
   ```
   > `.env` dosyası `.gitignore`'da olduğu için gizli anahtarların GitHub'a gitmez. ✅

### 2) Vercel'de projeyi içe aktar
1. https://vercel.com adresine gir, **GitHub ile giriş yap**.
2. **Add New → Project** → az önce yüklediğin repoyu seç → **Import**.
3. Framework otomatik **Next.js** olarak algılanır. Ayarlara dokunma.

### 3) Veritabanı bağla (ücretsiz)
1. Vercel'de projeni açıp **Storage** sekmesine gir.
2. **Create Database → Postgres** (Neon) seç → oluştur.
3. Vercel bunu otomatik olarak `DATABASE_URL` ortam değişkeni olarak projene bağlar.
   > Tablolar ilk kullanımda **otomatik** oluşturulur (elle bir şey yapmana gerek yok).

### 4) (İsteğe bağlı) Kendi AI anahtarların
Sohbet ve görsel modu **anahtarsız** çalışır. İstersen daha güçlü modeller için
Vercel → **Settings → Environment Variables** kısmına ekleyebilirsin:
- `GEMINI_API_KEYS` = virgülle ayrılmış Gemini anahtarların
- `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `OPENAI_API_KEY`

### 5) Deploy
- **Deploy** butonuna bas. Birkaç dakikada canlı olur.
- Sana kalıcı bir adres verir: `https://xasilkan-ajan.vercel.app`

---

## 📱 APK yapımı (PWA Builder)
1. https://www.pwabuilder.com adresine git.
2. Yukarıda aldığın **kalıcı Vercel adresini** yapıştır → **Start**.
3. **Package For Stores → Android → Generate Package**.
4. İnen zip'teki `app-release-signed.apk` dosyasını Android telefonuna kurabilirsin.

> Önemli: APK, arkadaki Vercel adresini açar. O yüzden APK'nın çalışması için
> **kalıcı Vercel adresi** kullan (sandbox/önizleme adresi değil).

---

## 🛠️ Yerel geliştirme
```bash
npm install
npm run dev
```
`.env` içine `DATABASE_URL` koy (yerel Postgres). Şema uygula:
```bash
npx drizzle-kit push
```
