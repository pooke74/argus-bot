# Argus Kripto Robotu - Buluta Taşıma Rehberi 🚀

Sisteminizi internete açmak ve 7/24 çalıştırmak için aşağıdaki adımları takip edin.
Bu işlem için **Render** (Ücretsiz) servisini kullanacağız.

## 1. Hazırlık (Bilgisayarınızda)
Önce kodlarınızı GitHub'a yüklemeniz gerekiyor.
1.  Bir **GitHub** hesabı açın (yoksa).
2.  Bilgisayarınızda proje klasöründe (`ArgusWeb`) terminali açın ve şu komutları yazın:
    ```bash
    git init
    git add .
    git commit -m "Argus v1 - Cloud Ready"
    ```
3.  GitHub'da "New Repository" diyerek yeni bir depo oluşturun (Adı: `argus-bot`).
4.  GitHub'ın size verdiği "push" komutlarını yapıştırın.

## 2. Sunucu Kurulumu (Render.com)
1.  [Render.com](https://render.com) adresine gidin ve GitHub ile giriş yapın.
2.  **"New +"** butonuna basın ve **"Web Service"** seçin.
3.  Listeden GitHub'daki `argus-bot` projenizi seçin.
4.  Formu şöyle doldurun:
    *   **Name:** `argus-bot`
    *   **Environment:** `Node`
    *   **Build Command:** `npm install && npm run build`
    *   **Start Command:** `node server.cjs`
    *   **Instance Type:** `Free`
5.  **"Create Web Service"** butonuna basın.

## 3. Sonuç
Render yaklaşık 2-3 dakika içinde kurulumu tamamlayacaktır. Size şuna benzer bir link verecek:
👉 `https://argus-bot.onrender.com`

Bu linke tıkladığınızda:
1.  Siteniz açılacak.
2.  "Başlat" dediğinizde robot bulut sunucusunda çalışmaya başlayacak.
3.  Bilgisayarınızı kapatsanız bile robot o adreste çalışmaya devam edecek!

⚠️ **Not:** Ücretsiz Render planında sunucu 15 dakika hareketsiz kalırsa uykuya dalar. Robotun sürekli çalışması için ayda $7'lik plana geçmeniz veya UptimeRobot gibi bir servis kullanmanız gerekebilir.

## Sık Sorulan Sorular

### S: OneDrive, Google Drive veya Dropbox kullanamaz mıyım?
**C: Maalesef hayır.**
*   **OneDrive:** Dosyaları *saklar* (Depo gibidir).
*   **Render:** Kodu *çalıştırır* (Motor gibidir).
Yapay zeka robotunuzun çalışması için bir "işlemciye" (CPU) ve "RAM"e ihtiyacı vardır. OneDrive'a sadece kodun metin halini koyabilirsiniz, ama kodu çalıştırıp işlem yapacak bir bilgisayar gücü vermez. Bu yüzden Render gibi bir "Sunucu" hizmeti şarttır.

