# BioTrack Gerçek 3B Anatomi Atlası Uygulama Planı

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ana ekranda beynin de bulunduğu, tüm ana iç organların aynı insan modeli üzerinde gerçekten görünür olduğu, dokunarak döndürülebilen ve seçilen organı sarı vurgulayan mobil 3B anatomi atlası oluşturmak.

**Architecture:** Mevcut raster gövde + yaklaşık SVG konturları kaldırılacak. CC BY 4.0 lisanslı BodyParts3D organ meshleri optimize edilmiş GLB dosyalarına dönüştürülecek ve React Three Fiber sahnesinde gerçek 3B katmanlar olarak çizilecek. Düşük güçlü cihazlarda yalnız performans fallback’i kullanılacak; AI ile üretilmiş anatomi görseli kullanılmayacak.

**Tech Stack:** Next.js 16, React 19, Three.js, `@react-three/fiber`, `@react-three/drei`, BodyParts3D CC BY 4.0, GLB/Draco veya Meshopt, mevcut PWA.

---

## Nerede Anlaşamadık?

Mevcut uygulamada organ adlarını ve yaklaşık SVG seçim alanlarını artırdım; fakat akciğer, mide, pankreas ve dalak **gerçek görsel organ modeli olarak eklenmedi**. Kullanıcının istediği şey menüde organ ismi görmek değil, organların insan gövdesi içinde aynı anda görünür olmasıydı. Yeni uygulama bu ayrımı temel kabul eder.

## Kabul Kriterleri

- İlk açılışta beyin, akciğerler, kalp, karaciğer, safra kesesi, mide, pankreas, dalak, iki böbrek, adrenal bezler, ince bağırsak, kalın bağırsak ve mesane gerçek mesh olarak görünür.
- Profil varyantına göre uterus veya prostat/pelvik yapı gösterilir; kaynakta güvenilir mesh yoksa uydurulmaz ve açıkça “kaynak bekliyor” denir.
- Kullanıcı modeli tek parmakla döndürür, iki parmakla yakınlaştırır; dikey sayfa kaydırması bozulmaz.
- Bir organa veya organ listesine dokununca yalnız o organ sarı/emissive olur; diğer organlar görünür kalır fakat hafif kararır.
- Beyin kadraj içinde ve seçilebilir olur.
- Sistem filtreleri organları saklamak yerine görünürlük/opaklık katmanını kontrol eder.
- 390×844 mobilde ilk etkileşimli görüntü 3 saniye altında açılır; 3B paket toplamı hedef olarak 8 MB altında tutulur.
- `prefers-reduced-motion`, klavye seçimi, ekran okuyucu organ listesi ve WebGL fallback’i çalışır.
- Arayüzde “eğitim amaçlı, tanı aracı değildir” sınırı ve veri atfı görünürdür.

---

### Task 1: Kaynak ve organ kapsam manifestini sabitle

**Objective:** “Tüm organlar” ifadesini test edilebilir bir organ listesine ve resmi kaynak kimliklerine dönüştürmek.

**Files:**
- Create: `src/lib/anatomy/atlas-manifest.ts`
- Create: `public/anatomy/3d/ATTRIBUTION.md`
- Create: `scripts/test-anatomy-manifest.cjs`
- Reference: `docs/anatomy-sources.md`

**Steps:**
1. BodyParts3D `partof_parts_list_e.txt` ve `isa_parts_list_e.txt` içinde her kabul kriteri organının BP/FMA kimliğini doğrula.
2. Her organ için `id`, Türkçe ad, FIPAT/English adı, sistem, kaynak ID, GLB yolu, varsayılan renk ve mobil öncelik alanlarını tanımla.
3. Eksik organ kimliği varsa eşdeğer compound-organ kaydını kullan; tahminî mesh veya AI görseli ekleme.
4. Manifest testinde zorunlu organ listesinin eksiksiz, ID’lerin benzersiz ve dosya yollarının güvenli olduğunu doğrula.
5. Atıf metnine BodyParts3D’nin zorunlu CC BY 4.0 ifadesini aynen ekle.

**Verification:** `node scripts/test-anatomy-manifest.cjs` → tüm zorunlu organlar PASS.

### Task 2: Resmî mesh indirme ve optimizasyon hattını kur

**Objective:** Büyük BodyParts3D arşivinden yalnız gereken organları seçip mobil GLB dosyalarına dönüştürmek.

**Files:**
- Create: `scripts/anatomy/fetch-bodyparts3d.mjs`
- Create: `scripts/anatomy/build-organ-glb.mjs`
- Create: `scripts/anatomy/verify-meshes.mjs`
- Create: `public/anatomy/3d/organs/*.glb`
- Modify: `package.json`

**Steps:**
1. `obj2gltf`, `@gltf-transform/cli` ve gerekli Three.js paketlerini sabit sürümle ekle.
2. Arşivi repo dışında cache’e indir; SHA-256 ve kaynak URL’sini kaydet.
3. Manifestteki BP kimliklerine ait OBJ dosyalarını seç; gereksiz tüm meshleri dışarıda bırak.
4. OBJ → GLB dönüştür; eksen, merkez ve ölçeği tek insan koordinat uzayında koru.
5. Meshopt/Draco, quantization ve gereksiz normal/UV temizliği uygula.
6. Her GLB için vertex sayısı, bounding box, byte boyutu ve organ adı raporu üret.

**Verification:** Toplam organ paketi hedefi ≤8 MB; tüm bounding box’lar aynı gövde koordinat sisteminde ve dosyalar parse edilebilir.

### Task 3: Gerçek 3B sahne omurgasını oluştur

**Objective:** Tam baş dâhil insan anatomi sahnesini mobil WebGL üzerinde göstermek.

**Files:**
- Create: `src/components/anatomy/AnatomyCanvas.tsx`
- Create: `src/components/anatomy/OrganMesh.tsx`
- Create: `src/components/anatomy/AnatomyCamera.tsx`
- Create: `src/components/anatomy/anatomy-3d.css`
- Modify: `src/components/anatomy-hero.tsx`

**Steps:**
1. Canvas’ı dynamic import ile yalnız istemcide yükle.
2. Orthographic veya dar FOV perspective kamera ile baştan pelvise tüm organları kadraja al.
3. Organ GLB’lerini kademeli yükle; beyin, akciğer, kalp ve sindirim çekirdeğini ilk paket yap.
4. Tek parmak orbit, iki parmak zoom ve güvenli kamera sınırlarını kur.
5. WebGL yoksa açıkça etiketlenmiş statik fallback göster.

**Verification:** 360, 390 ve 430 px mobil genişliklerde beyin ile mesane aynı sahnede görülebilir; yatay taşma yok.

### Task 4: Organ seçimi ve sarı aktivasyon davranışını kur

**Objective:** Görsel mesh ve menü seçimini tek state üzerinden yönetmek.

**Files:**
- Create: `src/components/anatomy/OrganList.tsx`
- Create: `src/lib/anatomy/selection.ts`
- Modify: `src/components/anatomy/OrganMesh.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Test: `scripts/test-anatomy-selection.cjs`

**Steps:**
1. Raycasting ile gerçek organ meshine dokunmayı seçime bağla.
2. Seçili organda sarı `emissive` ve kontrollü nabız animasyonu uygula.
3. Diğer organları tamamen gizleme; opaklığı yaklaşık %35–50’ye indir.
4. Organ listesindeki seçim ile sahnedeki seçim aynı `organId` state’ini kullansın.
5. Tekrar dokunma, boş sahne, Escape ve kapatma düğmesiyle seçimi temizle.

**Verification:** Beyin, akciğer, mide, pankreas ve dalak hem mesh üzerinden hem listeden seçilir; yalnız hedef sarı olur.

### Task 5: Sistem menülerini görsel hiyerarşiye dönüştür

**Objective:** İç içe ve tek renk görünümü ortadan kaldırıp sistemleri anlaşılır katman kontrolleri yapmak.

**Files:**
- Create: `src/components/anatomy/SystemRail.tsx`
- Modify: `src/components/anatomy/anatomy-3d.css`
- Modify: `src/components/dashboard-v3.css`
- Modify: `src/app/app-shell.tsx`

**Steps:**
1. Sinir, solunum, dolaşım, sindirim, üriner, endokrin, lenfatik ve üreme sistemlerini ayrı kartlar halinde göster.
2. Her kartta sistem adı, organ sayısı ve tutarlı çizgi ikonu kullan.
3. Sistem seçiminin yalnız ilgili organları öne çıkarmasını, diğerlerini bağlam olarak korumasını sağla.
4. Ana alt navigasyonu bu atlas kontrollerinden görsel olarak ayır.
5. Mobilde sistem rayını yatay scroll-snap; masaüstünde dikey katman paneli yap.

**Verification:** Kullanıcı sistem, organ ve uygulama navigasyonunun birbirinden farklı olduğunu ilk bakışta anlayabilir.

### Task 6: Bilimsel doğruluk ve görsel kalite kapısı

**Objective:** Yanlış konumlu veya yapay organın yayına girmesini engellemek.

**Files:**
- Create: `docs/anatomy-qc-checklist.md`
- Create: `scripts/anatomy/render-qc.mjs`
- Modify: `public/anatomy/3d/ATTRIBUTION.md`

**Steps:**
1. Ön, arka, sağ, sol ve 45° açı renderları üret.
2. Karaciğerin anatomik sağda, midenin/dalağın solda, kalbin mediastende, böbreklerin posterior konumda olduğunu kontrol et.
3. Beyin ve spinal bağlantı, bronş-akciğer ilişkisi ve bağırsak çevreleme düzenini görsel QC’den geçir.
4. Üretilmiş/uydurulmuş atlas görselini kaynak mesh yerine kullanma.
5. Klinik doğruluk iddiası koyma; anatomi uzmanı incelemesini ayrı yayın kapısı olarak kaydet.

**Verification:** Beş açı QC görselleri ve imzalanabilir kontrol listesi hazır.

### Task 7: Mobil performans ve erişilebilirlik

**Objective:** 3B atlası orta sınıf telefonlarda kullanılabilir tutmak.

**Files:**
- Create: `src/components/anatomy/AnatomyFallback.tsx`
- Modify: `src/components/anatomy/AnatomyCanvas.tsx`
- Modify: `public/sw.js`
- Test: `scripts/test-anatomy-assets.cjs`

**Steps:**
1. Lazy loading, düşük DPR sınırı ve görünürlük dışındayken render durdurma uygula.
2. `prefers-reduced-motion` durumunda nabız ve otomatik kamera hareketini kapat.
3. Organ listesini gerçek button/ARIA pressed kontrolleriyle erişilebilir yap.
4. Yeni GLB’leri immutable cache’e al; HTML/RSC için network-first politikasını koru.
5. Asset bütçesi testini CI/build öncesine ekle.

**Verification:** 360×800 cihazda taşma 0; organ seçimi 44 px dokunma hedefleriyle çalışır; fallback erişilebilir.

### Task 8: Production doğrulama ve yayın

**Objective:** Yeni atlasın gerçekten dış bağlantıda göründüğünü kanıtlamak.

**Files:**
- Modify: `public/sw.js` cache version
- Create: `docs/anatomy-release-checklist.md`

**Steps:**
1. `npx tsc --noEmit -p tsconfig.json` ve `npm run build` çalıştır.
2. Production sunucusunu yeni build ile yeniden başlat.
3. Mobil tarayıcıda beyin, akciğer, mide, pankreas ve dalak meshlerini görünür olarak doğrula.
4. Her birini seçip computed material renginin sarı olduğunu ölç.
5. Dokunma orbit/zoom, sayfa scroll’u, modal odak ve geri dönüş akışını test et.
6. Service Worker sürümünü artır; eski cache’in activate aşamasında silindiğini doğrula.
7. Public URL’den HTTP 200 ve gerçek yeni organ sahnesi kanıtını al.

**Final acceptance:** Kullanıcının saydığı beş organ ekranda gerçek biçimde görülmeden ve beyin tam kadraja girmeden görev tamamlandı sayılmaz.

---

## Riskler ve Kararlar

- **BodyParts3D anatomisi yetişkin referans modelidir:** Her vücut tipini temsil etmez; kişisel anatomi diye sunulmaz.
- **“Tüm organlar” teknik olarak binlerce alt yapı içerir:** İlk yayın kapsamı, manifestteki tüm ana makroskopik iç organlardır; alt lob/kanal/damar yapıları sonraki atlas seviyesi olur.
- **Kadın/erkek tam model eşliği:** Açık kaynakta eşdeğer güvenilir mesh yoksa ticari BioDigital lisansı değerlendirilir; eksik model yapay olarak üretilmez.
- **Performans:** 8 MB bütçesi aşılıyorsa sistem paketleri isteğe bağlı yüklenir; doğruluk için gerekli geometri körlemesine azaltılmaz.
- **Mevcut SVG:** Yeni 3B sahne kabul testlerinden geçene kadar geri dönüş amacıyla tutulur; sonra ana deneyimden kaldırılır.
