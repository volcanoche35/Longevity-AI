# BioTrack — kişisel takviye asistanı, yerel test sürümü

## Ürün odağı
Kullanıcı profilini, kendi takviye kullanım kayıtlarını ve hissettiği günlük etkileri birlikte takip eder. Anatomi yardımcı keşif yüzeyidir; tanı veya organ sağlık skoru değildir.

## Çalışan akış
- İlk açılışta karşılama ve profil formu: yaş, boy, kilo zorunlu; cinsiyet alanında belirtmeme seçeneği vardır. Ad ve hedef isteğe bağlıdır.
- Ayrı kadın/erkek beden tercihi yoktur. Anatomi, profildeki cinsiyetten türetilir; belirtilmediyse genel örnek model etiketlenir.
- Profil ve ürünler aynı tarayıcıda kalır. Sonraki açılışta onboarding tekrar istenmez. Önceki profil kayıtları göç edilir; eksik yaş gibi alanlar uydurulmaz.
- Günlük miktar: mg/µg/g/IU/damla/adet/ml; içerik formları ayrı satırlar, yalnız uyumlu kütle birimleri toplanır.
- Bugün ekranındaki kullanım işaretleri yerel gün bazlıdır, gece yarısı ve uygulamaya geri dönüşte yenilenir. Günlük işaret geçmişi en fazla 90 kayıtlı gün tutulur.
- Günlüğüm: enerji, uyku ve sindirim 1–5 özbildirimi ve not; gerçek kayıtlarla 7/14 gün grafiği, eksik günlerde çizgi kopar. Veri yokken sahte puan gösterilmez. Kullanım ve özbildirim beraber gösterilir; nedensellik ve korelasyon katsayısı iddiası yoktur.
- Hatırlatmalar: kullanıcı başlık/saat/tür/not seçer; zamanı gelen kart ana sayfada da görünür. Aldım/tamamla, 10 dakika erteleme, düzenleme ve silme vardır. Tamamlandı işareti gün bazlıdır.
- Profilimi AI ile değerlendir: açık ve geri alınabilir izin varsa yaş, boy, kilo, cinsiyet, hedef, isteğe bağlı sağlık notları ve son 14 kayıt gününün özbildirim/kullanım bağlamı paylaşılır. Ad/e-posta/ham kullanıcı kimliği paylaşılmaz.

## AI davranış sözleşmesi
Uygulamadaki gerçek sistem prompt'u: `src/lib/assistant-policy.ts`.
API profil doğrulaması: `src/lib/health-profile.ts`; günlük bağlamı: `src/lib/observation-context.ts`.
Eksik ilaç/hastalık/alerji alanları bilinmiyor sayılır. Demografiden tanı, vitamin eksikliği veya kesin doz çıkarılmaz. İstatistik hesaplanmadıysa etki yüzdesi/korelasyon katsayısı üretilmez. Kullanıcı onayı olmadan hatırlatma oluşturulmaz; AI sohbeti kendiliğinden zamanlayıcı değildir.

## Kaynaklı genel bilgi
NIH ODS Vitamin D fact sheet: https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/
Kaynak bağırsakta yağ bulunmasının D vitamini emilimini artırabildiğini ve yağ olmadan da bir miktar emilim olduğunu belirtir. Bu, kişisel doz, herkese sabit saat veya ek yağ tüketme gerekliliği değildir. Klinik başlangıç kataloğunun tüm kayıtları için kaynak incelemesi yapılmış değildir.

## Gerçek doğrulama
- TypeScript ve üretim build başarılı; `/api/ai` dinamik, `/tracking` ve `/reminders` rotaları çıktı listesinde.
- Profil/depolama/doz/gece yarısı/günlük/hatırlatma/AI payload doğrulama test scriptleri `scripts/test-*.cjs` altında.
- Ayrı QA tarayıcısında: ilk karşılama → zorunlu ölçüler → cinsiyetten kadın anatomi → yenilemede hatırlama; paylaşım izni kapalıyken profil analizi isteği yok; açıkken gerçek sağlayıcı yanıtı ve payload'da ad olmaması doğrulandı.
- Gerçek UI: ürün ekleme → Bugün'de işaret → günlük puanı/not → yenilemede grafik; hatırlatma oluştur → ana sayfada zamanı gelen kart → tamamla → yenilemede korunma doğrulandı.
- Gerçek AI isteğinde bir günlük özbildirim ve işaretli ürün ismi bulundu; gerçek yanıt bir günden fayda/nedensellik çıkarılamayacağını açıkladı.
- 360/390/430/1280px dashboard ve 360/430px profil/günlük/hatırlatma genişliklerinde belge taşması yok.

## Açık sınırlar — tamamlanmış gibi sunulmayacak
- Gerçek bulut üyelik/auth/senkronizasyon ve ödemeler bağlı değildir; bu sürüm yerel tarayıcı deposudur. Tarayıcı verisi silinirse kayıtlar gider; veri deposu şifreli bulut yedeği değildir.
- Mevcut adres HTTP'dir. Kapalı uygulamada push ve işletim sistemi zamanlayıcısı yoktur. Hatırlatmalar yalnız uygulama açıkken/geri dönüldüğünde görünür, arka planda garanti bildirim vermez.
- AI yanıtları klinik olarak denetlenmiş tıbbi öneri değildir. Kaynaklı kapsamlı ürün/ilaç etkileşim motoru ve güvenlik garantisi bulunmaz.
- İllüstrasyonlar anatomik eğitim amaçlı yaklaşık görsellerdir; klinik segmentasyon veya tanı atlası değildir.
- Kayıtlar kullanıcının beyanıdır; saat/dose alım doğrulaması, tahlil entegrasyonu veya ölçüm sensörü yoktur.
