# BioTrack — kompakt koç görünümü / ikinci düzenleme

## Kullanıcı kapsamı
1. Model/beden seçimi ve kafa karıştıran model etiketleri yok; kadın/erkek görünümü profil cinsiyetinden otomatik.
2. Kalp, akciğer, karaciğer, mide, bağırsak gibi dokunulabilir organlar belirgin ama sakin; sinir sistemi mevcut assette baş kırpık olduğundan ayrı dürüst şematik detayla erişilebilir.
3. Büyük Sistemler rayı yerine kompakt keşif; etkileşim kısa açıklama + mevcut ürünlerle kaynaklı ilişki + asistan bağlantısı. Aktivite tedavi veya organın iyileştiği anlamına gelmez. Kaynaksız eşleştirme yok; D vitamini nörolojik fayda genellemesi yok.
4. Basit günlük miktar: kullanım şekli → miktar + birim. Toz için mg/g; damla/adet için doğrudan miktar. Etiket içeriği/çoklu form ayrı isteğe bağlı detayda; eski dose_plan kayıtları korunur.
5. Kişiselleştirme tek Ayarlar sayfasında; ilgili sekmede Özelleştir düğmesi aynı ayarları modal panelde açar. Zorunlu profil ve sağlık paylaşım izni gizlenmez/çoğaltılmaz.
6. Bu tur sonrası hatırlatıcı kurulumunu konuş; mevcut uygulama-içi hatırlatmayı bozma. Push/arka plan garanti iddiası yok.

## Ayrı dosya sahipliği
- Enzo: supplements/page.tsx, dosage.ts, doz testleri; ürün formu ve miktar özeti. Model, profil ve diğer UI'ye dokunmaz.
- Pixel: anatomy-hero.tsx, anatomy-regions.ts, dashboard-v3.css, dashboard/page.tsx, yeni supplement-regions.ts ve ilişki testleri. Küresel CSS, envanter veya profil şemasına dokunmaz.
- Ayarlar agent'ı: preferences.ts, settings-panel.tsx, customize-button.tsx, settings.css, settings/page.tsx, ayar testleri. Diğer sayfaların entegrasyonunu sahipleri yapar; kalan sekmeleri HAL bağlar.
- HAL: entegrasyon, bağımsız spec ve kalite kontrolü, gerçek tarayıcı testi, build/yayın ve commit.

## Paylaşılan sözleşme
`CustomizeButton` default export, props `{section: 'dashboard'|'supplements'|'tracking'|'reminders'|'assistant'|'profile'}`.
`usePreferences()` named export `@/lib/preferences`: kararlı nesne döndürür; şema `{dashboard:{showAnatomy:boolean,showEducation:boolean},supplements:{defaultForm:'Hap'|'Kapsül'|'Damla'|'Toz'|'Sıvı'|'Diğer',defaultTime:'Sabah'|'Öğle'|'Akşam'|'Gece'}}`.
Başlangıç showAnatomy/showEducation true, defaultForm Hap, defaultTime Sabah. Kayıt anahtarı `PREFERENCES_KEY` export. Ayar kapalıyken anatomi özelleştirme düğmesi kaybolmaz. Veri bozulması, kota hatası, same-tab ve cross-tab değişim test edilir.

## Kabul kapıları
Eski ölçüler/ürünler korunur; powder 5g/500mg, damla12, kapsül1+etiket200mg ve sitrat200+klorür200 örnekleri; profil cinsiyetine otomatik görüntü; organ dokunma/klavye/Escape; ayarların tek kaynaktan okunması ve yeniden açmada korunması; 360/390/430/1280 taşma yok. AI/klinik kaynak veya grafik uydurulmaz.
