# BioTrack — Koç yönü UX hakem notu (Opus)

Kapsam: yayındaki `514fa63` (HEAD) + canlı http://46.224.215.133:3000 sayfaları. Bu bir UX yönü önerisi; kalite gate'i, tıbbi ya da hukuki inceleme yerine geçmez.

## Kanıt: ne gördüm / ne göremedim
- **Gördüm (curl ile, SSR metni):** `/supplements` "0 envanter · 117 katalog kaydı", "+ ile ekle". `/tracking` 1–5 arası Enerji/Uyku/Sindirim özbildirimleri, 7/14 gün trendi ve "sağlık sonucu değildir" uyarısı. `/dashboard` ve `/reminders` SSR'da yalnızca "yükleniyor…" gösteriyor; içerik client tarafında geliyor.
- **Gördüm (`git show HEAD:`):** Ekleme formunda şu alanlar var: Takviye adı, Form/içerik adı, Miktar/gün, Günlük kullanım adedi, Kullanım şekli, Kullanım zamanı, Not, "+ Farklı form / içerik ekle" ve "EMİLİM / ETKİLEŞİM UYARISI". Dashboard'da "DEMO · cihaz verisi" rozeti, `profile.anatomyVariant` ve sistem bazlı `selectedSystem` rayı var. Palet `#A8BFAE / #111617` ve sade; neon yok.
- **Göremedim:** İzole tarayıcı oturumu (`opus-design-review`) açılmadı, daemon hata verdi. Bu yüzden mobil ekran görüntüsü, render edilmiş anatomi, dialoglar ve gerçek dokunma akışı doğrulanmadı. Diğer agent'ların çalışan değişikliklerine bakmadım.

## 1) En önemli 3 ürün/UI problemi
1. **Ekleme formu 7+ karar istiyor.** Kullanıcı ilk takviyesinde form/içerik, adet, şekil, zaman ve not kararlarıyla karşılaşıyor. Envanter boş başladığı için bu form ürünün kapısı. Burada kaybedilen kullanıcı anatomi değerine hiç ulaşmıyor.
2. **Satın alma değeri yanlış yerde.** Ön plandaki sayfalar Günlük/Hatırlatma/özbildirim; bunlar her uygulamada var. Ayırt edici değer anatomi × kaynaklı bilgi. Bugünkü yapıda anatomi büyük "Sistemler" rayının arkasında, varyantı profilden ayrı yönetiliyor ve DEMO/cinsiyet bilgisi tekrar ediyor. Organ → ürün → kaynak bağı tek dokunuşta kurulmuyor.
3. **Güven dili tutarsız.** Bir yandan "tıbbi doğrulama içermez" deniyor. Öte yandan tek bir "EMİLİM / ETKİLEŞİM UYARISI" bloğu var. Bulgu çıkmadığında bu blok kullanıcıya örtük bir "sorun yok" onayı gibi okunabilir. Organ eşleşmeleri de "fayda" diliyle sunulursa (ör. D vitamini → "CNS benefit") uydurma iddia riski doğar.

## 2) Mobil ilk ekran şeması (≤5 blok, 390px)
1. **Başlık satırı:** "Bugün" ve ⚙ (o sekmenin özelleştirme dialogu). Model veya cinsiyet rozeti yok. DEMO yalnızca gerçekten demo veride görünür, o da tek yerde.
2. **Anatomi keşfi (kompakt, ≈ ekranın %40'ı):** Gövde silueti; varyant profildeki cinsiyetten otomatik geliyor, seçici yok. Dokunulabilir 6 organ: beyin, kalp, akciğer, karaciğer, mide, bağırsak. Envanterde kaynaklı ilişkisi olan organlarda küçük bir nokta var. Büyük Sistemler rayı kalkıyor.
3. **Organ kartı (bottom sheet, dokununca):** "Karaciğer · envanterinden 2 ürünün kaynaklı ilişkisi var". Her satırda ürün, bir cümlelik ilişki ve kaynak etiketi (ör. NIH ODS). Kaynak yoksa satır gösterilmiyor.
4. **Bugün listesi:** Ürün adı, şekli ve günlük miktarı yazılı; yanında tek dokunuşla "aldım" işareti var.
5. **Birlikte kullanım (dar kart):** Yalnızca kaynaklı eşleşme varsa sayıyla görünüyor. Eşleşme yoksa bu kart güvence vermeyen bir cümleye dönüşüyor (bkz. §5).

Günlük, trend ve hatırlatma ayrı sekmelerde kalıyor; ilk ekranda yer almıyor.

## 3) Formu 3 karara indiren copy
- **Karar 1, adı:** "Ne kullanıyorsun?" Placeholder: "Magnezyum, D vitamini, omega-3…". Katalogdan seçilince 2. adıma otomatik geçiliyor.
- **Karar 2, şekli:** "Hangi şekilde?" Seçenekler çip olarak geliyor: Tablet · Kapsül · Toz · Damla · Sıvı · Sakız.
- **Karar 3, günlük miktarı:** "Günde ne kadar alıyorsun?" Seçilen şekle göre birim değişiyor: Tablet/kapsül → "adet", Toz → "mg | g" anahtarı, Damla → "damla". Yardım metni: "Ürününün etiketinde yazanı gir. BioTrack miktar önermez."
- **Katlanmış, isteğe bağlı:** "Etiket detayı ekle (içerik, form adı, saat, not)". Varsayılan olarak kapalı.
- **Kaydet butonu:** "Ekle". Sonrasında şu mesaj: "Eklendi. Anatomide ilgili organlara bakabilirsin."

## 4) Geliştirici ekip için kabul ölçütleri (≤5)
1. Yeni kullanıcı katalogdaki bir ürünü **en fazla 3 kararla** ve isteğe bağlı alanların hiçbirine dokunmadan kaydedebiliyor. Toz seçildiğinde mg/g anahtarı görünüyor; tablet veya kapsülde görünmüyor.
2. Anatomi varyantı yalnızca `profile.sex` değerinden türetiliyor. UI'da varyant seçici yok. Cinsiyet veya model rozeti ekranda **en fazla 1 kez** geçiyor; DEMO rozeti yalnızca demo veride görünüyor.
3. 390×844 boyutunda ilk ekranda anatomi ve en az 6 dokunulabilir organ (beyin, kalp, akciğer, karaciğer, mide, bağırsak) kaydırmadan görünüyor. Dokunma hedefleri ≥44px. Organ kartındaki her ilişki satırında görünür bir kaynak bağlantısı var; kaynağı olmayan ilişki render edilmiyor.
4. Birlikte kullanım panelinde eşleşme yoksa yeşil, onay ya da "güvenli" dili kullanılmıyor. Panel, sabit "kapsam sınırlı" metnini gösteriyor.
5. Bugün, Takviyeler, Günlük ve Hatırlatma sekmelerinin her birinde, o sekmenin ayarlarını açan bir ⚙ dialogu var. Profil/Ayarlar sayfası, tüm bu ayarların toplandığı merkez olarak kalıyor.

## 5) Ekranda iddia edilmemesi gereken 3 sağlık ifadesi
1. **"Etkileşim bulunamadı / birlikte kullanımı güvenli".** Bunun yerine: "Kaynaklarımızda bu ürünler için kayıtlı bir eşleşme yok. Bu, güvenli olduğu anlamına gelmez; eczacına veya hekimine danış."
2. **"D vitamini beyni/CNS'yi destekler" ya da herhangi bir organ için "fayda/iyileştirir".** Bunun yerine organ kartında kaynaklı, nötr ilişki dili: "[kaynak] bu besin öğesini … ile ilişkili olarak ele alıyor."
3. **"Önerilen / ideal günlük doz" veya "dozun uygun".** Kullanım bilgisi doz önerisi değildir. Gerçek Türkiye mevzuat incelemesini ayrı bir agent yapmalı.

## Kapsam dışı / belirsiz
- Render edilmiş mobil görünüm, animasyonlar ve dialoglar tarayıcı açılamadığı için doğrulanmadı.
- Katalogdaki 117 kaydın kaynak kalitesi ve organ eşlemeleri incelenmedi.
- Hukuki uygunluk (TR takviye ve sağlık beyanı mevzuatı) bu raporun dışında.
- Diğer agent'ların devam eden işinin durumu bilinmiyor ve bilinçli olarak araştırılmadı.
