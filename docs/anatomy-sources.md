# BioTrack — anatomi kaynakları ve ürün sınırı

## Kabul edilen omurga

- **IFAA / FIPAT — Terminologia Anatomica 2 (TA2):** İnsan anatomisi için uluslararası adlandırma ve hiyerarşi standardı. Uygulamadaki sistem → organ bilgi mimarisi bu sınıflamayı temel alır. TA2 çevrimiçi yayını CC BY-ND 4.0’dır; terimler değiştirilmeden referans alınır.  
  https://ifaa.net/committees/anatomical-terminology-fipat/fipat-ifaa-terminologies/
- **BodyParts3D:** Yeniden dağıtım ve uyarlamaya izin veren CC BY 4.0 anatomik model veritabanı. İleride gerçek GLB/mesh hattı kurulursa birincil açık veri adayıdır; zorunlu atıf korunmalıdır.  
  https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- **NLM Visible Human Project:** Kadın ve erkek kadavra kesitlerinden oluşturulmuş, kamuya açık ayrıntılı 3B referans veri. Model ve konum kontrolünde referans; mobil uygulamaya ham veri olarak konmaz (15–40 GB).  
  https://www.nlm.nih.gov/research/visible/visible_human.html
- **OpenStax Anatomy & Physiology:** Sistem temelli eğitim kapsamını kontrol etmek için açık ders kitabı kaynağı. Her baskının lisansı ayrıca doğrulanmalıdır; bazı yeni baskılar NC-SA koşulu taşır.  
  https://openstax.org/subjects/anatomy-and-physiology
- **BioDigital Human Developer Toolkits:** Gerçek zamanlı 3B için ticari Viewer API / iOS / Android SDK seçeneği. Domain/bundle kaydı ve lisans gerekir; anahtarsız veya izinsiz gömülmez.  
  https://www.biodigital.com/product/developer-toolkits

## Uygulama kararı

Mevcut sürüm, düşük donanımlı telefonlarda akıcı kalmak için ağır bir WebGL atlası yerine **dokunmayla eğilen 2.5B sahne + SVG organ katmanları** kullanır. Seçili organ sarı odak ve nabız animasyonuyla görünür. Sistem hiyerarşisi FIPAT’a dayanır; organ konturları ise eğitim amaçlı yaklaşık izdüşümlerdir.

Gerçek serbest dönüşlü 3B sürüm için doğru yol: BodyParts3D’den seçilmiş meshler → Blender’da sadeleştirme/UV → Draco sıkıştırılmış GLB → React Three Fiber ile isteğe bağlı yükleme → düşük güç modunda mevcut 2.5B fallback. Mesh doğruluğu bir anatomi uzmanı tarafından ayrıca incelenmeden “klinik atlas” etiketi kullanılmaz.

## Güvenlik ve dürüstlük

- Görsel; tanı, tedavi, cerrahi planlama veya kişiye özel organ değerlendirmesi değildir.
- Organ seçimi, kullanıcının organının durumunu veya bir takviyenin o organa faydasını göstermez.
- Sağ/sol her zaman modelin anatomik sağ/soludur; önden görünümde ekran yönü ters algılanabilir.
- AI ile üretilen anatomi görseli kalite kontrolünde eksik/yanlış organlar gösterdiği için ürüne alınmamıştır.
