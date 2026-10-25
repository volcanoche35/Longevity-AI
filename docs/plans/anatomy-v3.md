# Kompakt ve Kişiselleştirilmiş Anatomi — Uygulama Planı

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Mobil ana sayfada kompakt, noktasız sistem seçimi ve kullanıcı tercihine göre kadın/erkek anatomi görünümü sunmak.

**Architecture:** Mevcut Next.js görsel katmanları korunur; onaylanmış görsellere hizalı SVG maskeleri/path bölgeleri etkileşim alanı olur. SVG insan çizimi yerine görünmez etkileşim ve renk vurgusu sağlar. Sistem seçimi AI çağrısı değil deterministik arayüz davranışıdır. Profil tercihi görsel sunumu belirler, tıbbi öneri veya doz belirlemez.

**Tech Stack:** Next.js, React, TypeScript, SVG masks/paths, CSS, mevcut veri katmanı. İlk sürümde WebGL veya 3D motoru yok.

**Status:** Yerel test sürümü uygulandı ve tarayıcıda doğrulandı. Son kullanıcı düzeltmeleri bu ilk planı güncelledi: ayrı beden seçimi kaldırıldı; görünüm profilin cinsiyet alanından türetiliyor, yaş/boy/kilo zorunlu. Güncel kapsam ve sınırlar `docs/assistant-service.md` belgesindedir.

## Mevcut durum ve sınırlamalar

- `src/components/anatomy-hero.tsx`: 3 görsel katman, nokta tabanlı organ seçimi, maksimum 58vh sahne.
- `src/lib/anatomy.ts`: organ merkezleri ve katman kutuları var, organ sınır maskeleri yok. Sinir sistemi gibi yeni sistemler için asset yok.
- `src/app/profile/page.tsx`: görünüm tercihi yok. `src/app/auth/page.tsx` demo modunda üyeliği kapatıyor; gerçek hesap bağlantısı hazırmış gibi sunulamaz.
- `src/app/dashboard/page.tsx`: anatomiden sonra günlük liste geliyor; ürün adından türetilmiş Kanıt A sayacı ve ölçüm olmadan CANLI etiketi güvenilirlik açısından kaldırılmalı.
- Kadın asset seti mevcut değil. Erkek/kadın görselleri ve her birine ayrı hizalı maskeler üretilmeli veya lisanslı kaynaktan temin edilmeli; anatomik doğruluk ayrıca incelenmeli.

## 1. Kompakt kompozisyon taslağı
**Dosyalar:** `src/app/dashboard/page.tsx`, `src/components/anatomy-hero.tsx`, `src/app/globals.css`.
- Önce 360×800, 390×844 ve 430×932 için yerleşim beklentilerini yaz; mevcut ekranı referans al.
- Üstte kısa günlük özet, ortada yaklaşık 300–360 CSS px yüksekliğinde adaptif anatomi kartı; altında günlük kullanım planının başlangıcı.
- Gövde sabit koordinat uzayında oran korunarak contain ile yerleşsin; hit bölgeleri de aynı iç sahnede olsun. Görseli dikey sıkıştırma veya kenardan kırpma yok.
- Kompakt görünüm ve isteğe bağlı Genişlet görünümü; masaüstünde anatomi/plan yan yana.
- Doğrulama: mobil ilk ekranda anatomiyle beraber plan başlığı görünür; yatay taşma ve tab bar örtüşmesi yok. Gerçek tarayıcı ölçümleriyle doğrula, sonra commit.

## 2. Asset ve maske onayı
**Dosyalar:** `public/anatomy/female/*`, `public/anatomy/male/*`, `src/lib/anatomy.ts`; yeni `src/lib/anatomy-regions.ts`.
- Kadın/erkek siluetlerini aynı görsel dilde temin et; anatomi yerleşimleri için ayrı kontrol yap.
- İlk taslakta yalnız mevcut kapsamı koru: dolaşım ve sindirim. Kas/iskelet bölgesini ayrı etkileşimli sisteme dönüştürmek için ayrıca uygun katman üret; sinir sistemi sonraki faz.
- Organları çevreleyen SVG path maskeleri hazırla; farklı bedenler için koordinatları ayrı tanımla. Görünmez dikdörtgenleri organ sınırı diye kullanma.
- Doğrulama: karaciğer yönü, kalp konumu, sindirim hizası ve kadın/erkek tüm katman eşleşmeleri görsel olarak incelenir. QC geçmeyen asset kullanılmaz, sonra commit.

## 3. Noktasız seçim ve renk davranışı
**Dosyalar:** `src/components/anatomy-hero.tsx`, `src/lib/anatomy-regions.ts`, `src/app/globals.css`.
- Testleri önce yaz: hover geçici vurgu; click/tap kalıcı seçim; başka seçim önceki seçimi kaldırır; Esc kapatır.
- Görsel üzerinde görünür nokta olmayacak; gerçek organ/sistem sınırına uyan alan üzerinde dolaşım mercan/kırmızı, sindirim amber, kas/iskelet uygun ayrı renkle vurgulanacak.
- Aktif olmayan katmanları geri çek; yalnız parlaklık veya renk ile anlam aktarma, sistem adını ve seçili durumunu metinle göster.
- Üst üste gelen sistemlerde katman önceliği ve alttaki adlandırılmış sistem düğmeleri ile seçim belirsizliğini çöz.
- Mobilde hover yerine dokunma; her sistem ayrıca en az 44px hedefli erişilebilir düğmeden seçilebilir. Klavye focus/Enter ve reduced-motion desteği.
- Doğrulama: mouse, dokunma, klavye, farklı beden ve ekran boyutlarında aynı bölgeler; kaydırma engellenmez. Testler ve commit.

## 4. Görünüm tercihi ve onboarding
**Dosyalar:** `src/app/profile/page.tsx`, `src/app/auth/page.tsx`, `src/lib/data.ts`; yeni `src/components/anatomy-preference.tsx`.
- Önce yeni/eski kullanıcı ve seçim değiştirme senaryolarını testle.
- İlk kullanımda Kadın görünümü / Erkek görünümü seçimi sun; seçenek atlanabilir ve profilden değiştirilebilir. Kullanıcı seçmediyse kimlik tahmini yapma, model seçim durumunu açık göster.
- Alanı `anatomyVariant` gibi görsel tercih olarak adlandır; bu tercih sağlık verisi veya biyolojik cinsiyet çıkarımı değildir.
- Demo aşamasında yalnız görünüm tercihi cihazda kalıcı saklanır; bunun hesaplar arası senkronizasyon olmadığı belirtilir. Gerçek üyelik aktif olduğunda kullanıcıya bağlı profil alanı ve erişim politikalarıyla saklanır.
- Doğrulama: yenileme sonrası tercih korunur, yanlış asset anlık yanıp sönmez, değişiklik tüm katmanlara yansır, oturumlar arası sağlık verisi sızıntısı yok; commit.

## 5. Detay paneli ve dürüst içerik
**Dosyalar:** `src/components/anatomy-hero.tsx`, `src/app/dashboard/page.tsx`.
- Sistem tıklanınca mobilde alt bilgi paneli; masaüstünde yan panel. Koyu opak yüzey, arka plan blur, görünür kapatma, focus yönetimi; kapatınca odak tetikleyiciye döner.
- Ana sayfada kullanıcı tarafından girilen ürün ve günlük miktarları göster; kaynakla doğrulanmamış ürün-organ ilişkilerini kişiselleştirilmiş tıbbi fayda diye sunma.
- Ölçüm verisi olmadan CANLI, sağlık skoru ve ürün adından türetilmiş Kanıt A gibi iddiaları kaldır.
- Doğrulama: panel tab bara takılmaz, seçilen sistem başlığı doğru, tıbbi doğruluk ve kaynak statüsü açık; commit.

## 6. Kabul testleri ve teslim
- `npx tsc --noEmit -p tsconfig.json` ve `npm run build` başarılı olmalı.
- Gerçek tarayıcıda kadın ve erkek seçimi → sistem seçimi → detay paneli → kapat → yenile → tercih korunması zinciri çalışmalı.
- 360/390/430px genişliklerde taşma yok; portre/yatay yön değişiminde maske ve görsel hizası korunmalı.
- Hover-only kontrol yok; klavye ve reduced-motion doğrulanmalı.
- İlk yüklemede yalnız seçilen bedenin gerekli asset'leri yüklenir; iki beden setini gereksiz preload etme. Son payload ve etkileşim gecikmesini ölçüp kaydet; akıcılığı test etmeden iddia etme.
- Kullanıcı onayı sonrası uygulama yapılır; yayına alma ve endpoint okuma doğrulaması ayrı gerçekleştirilir. Bu belgedeki hiçbir tasarım tamamlanmış özellik olarak sunulmaz.

## Uygulama sırası
Önce kompakt kadın/erkek görsel taslağı onaya sunulur; ardından maskeler ve etkileşim; sonra profil tercihi ve son mobil doğrulama. Ücretli asset üretim adedi/maliyeti çağrı öncesinde kapsamlandırılır. Gerçek üyelik ve DB kurulumu bağımsız altyapı işi olarak ayrıca planlanır.
