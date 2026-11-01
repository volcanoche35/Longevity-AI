# LongevityAI — Kan Tahlili Modülü: Kaynaklı Tasarım Dokümanı

> Durum: tasarım dokümanı (kod değil). Tarih: 2026-11-01.
> Bu belge tıbbi tavsiye değildir; tanı, tedavi veya kişisel doz önerisi üretmez.
> Kaynaklar satır içi `[n]` olarak verilir; doküman sonunda `Sources` bloğunda URL + kurum + (gerektiğinde) birebir alıntı listelenir. Kaynak bulunamayan bir değer/aralık "kaynak doğrulanmadı" olarak işaretlenir — uydurulmaz.

---

## 1. Kapsam ve tıbbi sınır

### 1.1 Modül ne yapar, ne yapmaz

**Yapar:**
- Kullanıcının yüklediği kan tahlili raporundaki değerleri okur (metin katmanlı PDF → yerel ayrıştırıcı; taranmış/fotoğraf → vision modeli).
- Her değeri **öncelikle lab raporunun kendi referans aralığına** göre düşük/yüksek/normal işaretler. Katalog aralıkları (Bölüm 2) yalnızca lab aralığı eksikse yedek olarak kullanılır.
- Kullanıcının mevcut takviyeleriyle (Bölüm 3'teki kaynaklı kurallar) korelasyon kurar ve **bilgi verir**.
- Her durumda "hekimine sor" yönlendirmesi yapar.

**Yapmaz (ilke — kod düzeyinde zorlanır):**
- **Tanı koymaz.** "Demir eksikliğiniz var" denmez; "Değer, raporunuzdaki referans aralığın altında" denir.
- **Tedavi önermez.** "Ferritin düşük, demir takviyesi başlatın" denmez; "Ferritin değeriniz düşük görünüyor; demir kullanımınız ve ek ölçüm ihtiyacı için hekiminize danışın" denir.
- **Kişisel doz/süre reçetesi yazmaz.** Mevcut takviyenin dozu yalnızca etiketteki gibi gösterilir; birim çevrilip kişisel risk çıkarımı yapılmaz (mevcut `interaction-review.ts` kuralıyla aynı ilke).
- **Hastalık riski/yaşam beklentisi hesaplamaz.**

Türkiye'de takviye edici gıdalar ilaç değildir ve hastalık önleme/tedavi amacıyla kullanılmaz [19]. Bu modül aynı çizgiyi korur: çıktı genel bilgilendirmedir, sağlık beyanı değildir [20].

### 1.2 Kırmızı bayrak (kritik değer) davranışı

- Modül, lab'ın kendi "H/L" (high/low) işaretini ve değerin referans aralığından **belirgin** sapmasını gösterir.
- **Evrensel bir "kritik/panik değer" eşik listesi tek ve standart değildir**; eşikler lab cihazına, yönteme ve hastane protokolüne göre değişir (kaynak doğrulanmadı — bu yüzden modül kendi kritik eşiğini uydurmaz).
- Belirgin sapma (ör. değer, lab aralığının dışına hem yüksek hem de çok uzağa çıktıysa) veya lab raporunda "kritik/panik" işareti varsa modül yalnızca şunu der: **"Bu değer için vakit kaybetmeden hekiminize başvurun."** Tanı ifadesi, aciliyet derecesi veya "şu hastalığınız olabilir" çıkarımı yapılmaz.

### 1.3 Tıbbi cihaz yazılımı (MDR / TİTCK) riskinin düşük tutulması

- AB MDR 2017/745, "tıbbi cihaz" tanımına yazılımı da katar: üreticinin **tanı, önleme, izleme, tahmin, prognoz veya tedavi** amacıyla tasarladığı yazılım tıbbi cihazdır [16].
- Aynı tüzüğün gerekçe (recital) bölümü açıktır: **"yaşam tarzı ve iyi olma hali (wellbeing) amaçlı yazılım tıbbi cihaz değildir"** [16].
- TİTCK, MDR'yi uygular ve tıbbi cihaz yazılımı (MDSW) için nitelendirme/sınıflandırma rehberlerini (MDCG "Qualification and classification of software", MDCG 2023-4 vb.) referans gösterir [15].

**Sonuç:** Modül "değer oku → lab aralığına göre işaretle → bilgi ver → hekime yönlendir" çizgisinde kaldığı sürece tanı/tedavi/tahmin amacı taşımaz ve wellbeing kategorisinde kalır; MDSW/IVDR kapsamına girme riski düşüktür [15][16]. Riskin yükselmesini önleyen sınırlar:

1. Klinik karar destek skoru (örn. "kardiyovasküler risk %X", "hastalık olasılığı") **üretilmez**.
2. Değerden kişisel tedavi dozu **türetilmez** (ör. "D3'ü 2000 IU'ya çıkarın" yasak).
3. Çıktı her zaman bilgi + hekim yönlendirmesi formatındadır; "izleme/tanı aracı" olarak pazarlanmaz.

> Bu analiz regülasyonu düşük riskte tutma tasarımı içindir; "tıbbi cihaz değildir" yasal beyanı değildir. Ticari sürüm öncesi hukuki inceleme şarttır.

---

## 2. Biyobelirteç kataloğu (ilk sürüm)

**Öncelik ilkesi:** Uygulama, işaretlemeyi **her zaman lab raporundaki `ref_low`/`ref_high` değerleriyle** yapar. Aşağıdaki katalog aralığı yalnızca (a) lab aralığı raporda yoksa veya (b) OCR/vision çıkarımında okunamadıysa **yedek** olarak kullanılır ve kullanıcıya "katalog aralığı (genel yetişkin)" olarak işaretlenir.

**Kaynak notu:** Yetişkin aralıkları NIH ODS (takviye ilişkili belirteçler) ve NIH MedlinePlus Medical Encyclopedia'dan (klinik kimya) alınmıştır. Kaynağı doğrulanamayan aralık hücreleri "kaynak doğrulanmadı" olarak bırakılır. Birim dönüşüm çarpanları kaynakta çift birim verilmişse kaynaktan; verilmemişse standart SI çarpanı olarak (kaynak etiketli değil) verilir.

| # | Ad (TR) | Ad (EN) + OCR eş anlamlı/kısaltma | Birim (birincil / diğer) | Dönüşüm | Tipik yetişkin aralığı (yedek) | Kaynak | İlgili takviye | Retest (kaynaklıysa) |
|---|---|---|---|---|---|---|---|---|
| 1 | 25-Hidroksi D Vitamini | Vitamin D, 25-hydroxyvitamin D, 25(OH)D, "D Vitamini (25-OH)" | ng/mL / nmol/L | nmol/L = ng/mL × 2.5 (ODS; hassas çarpan 2.496) | <12 ng/mL eksiklik riski; 12–20 yetersiz; ≥20 yeterli | [1] | D3, D2 | kaynak doğrulanmadı |
| 2 | B12 (Kobalamin) | Vitamin B12, cobalamin, "B12" | pg/mL / pmol/L | pmol/L ≈ pg/mL × 0.74 (ODS: 200–250 pg/mL = 148–185 pmol/L) | <200–250 pg/mL normal-altı | [2] | B12 | kaynak doğrulanmadı |
| 3 | MMA (Metilmalonik asit) | Methylmalonic acid, MMA | µmol/L | — | >0.271 µmol/L eksikliği düşündürür | [2] | B12 (dolaylı) | kaynak doğrulanmadı |
| 4 | Ferritin | Ferritin | ng/mL (= µg/L) | 1:1 | Erkek 30–400; Kadın 13–150 | [11] | Demir | kaynak doğrulanmadı |
| 5 | Hemoglobin | Hemoglobin, Hb, Hgb | g/dL / g/L | g/L = g/dL × 10 | Erkek 13.8–17.2; Kadın 12.1–15.1 | [13] | Demir, B12, folat (dolaylı) | kaynak doğrulanmadı |
| 6 | Serum Demiri | Iron, Fe, "Demir" | µg/dL / µmol/L | µmol/L ≈ µg/dL × 0.179 | kaynak doğrulanmadı (ODS demir durumunu ferritin üzerinden değerlendirir) | [3] | Demir | kaynak doğrulanmadı |
| 7 | TSH | Thyroid-stimulating hormone, TSH | µU/mL (= mIU/L) | 1:1 | 0.4–4.8 µU/mL (yaşlılarda üst sınır daha yüksek, ~7'ye kadar) | [12] | Biotin (interferans), iyot | kaynak doğrulanmadı |
| 8 | HbA1c | Hemoglobin A1C, Glycated hemoglobin, "A1c" | % | — | <5.7 normal; 5.7–6.4 prediyabet; ≥6.5 diyabet | [14] | (diyet/ilaç bağlamı; takviye korelasyonu yok) | Prediyabette yılda 1; diyabette yılda ≥2 [14] |
| 9 | Magnezyum (serum) | Magnesium, Mg | mg/dL / mmol/L | mmol/L = mg/dL × 0.4114 | 0.75–0.95 mmol/L | [4] | Magnezyum (sınırlı — bkz. Bölüm 3) | kaynak doğrulanmadı |
| 10 | Çinko | Zinc, Zn | µg/dL / µmol/L | µmol/L ≈ µg/dL × 0.153 (ODS: 80–120 µg/dL = 12–18 µmol/L) | 80–120 µg/dL; <70 (kadın)/<74 (erkek) yetersiz | [6] | Çinko | kaynak doğrulanmadı |
| 11 | Bakır | Copper, Cu | µg/dL / µmol/L | µmol/L ≈ µg/dL × 0.157 | kaynak doğrulanmadı | [8] | Çinko (yüksek doz etkisi) | kaynak doğrulanmadı |
| 12 | Kalsiyum (total) | Calcium, Ca | mg/dL / mmol/L | mmol/L = mg/dL × 0.2495 (ODS: 8.8–10.4 = 2.2–2.6) | 8.8–10.4 mg/dL; iyonize 4.6–5.3 | [7] | Kalsiyum, D3 (dolaylı) | kaynak doğrulanmadı |
| 13 | Trigliserit | Triglycerides, TG | mg/dL / mmol/L | mmol/L = mg/dL × 0.0113 | <150 mg/dL arzu edilir | [25] | Omega-3 | kaynak doğrulanmadı |
| 14 | Total Kolesterol | Total cholesterol | mg/dL / mmol/L | mmol/L = mg/dL × 0.0259 | <200 mg/dL | [23] | (Omega-3 bağlamı) | kaynak doğrulanmadı |
| 15 | LDL | LDL cholesterol, "LDL-K" | mg/dL | — | <100 mg/dL (risk grubuna göre <70/<55) | [23] | (statin/omega-3 bağlamı) | kaynak doğrulanmadı |
| 16 | HDL | HDL cholesterol, "HDL-K" | mg/dL | — | ≥60 arzu edilir; <40 (erkek)/<50 (kadın) düşük | [23] | (bağlam) | kaynak doğrulanmadı |
| 17 | Açlık Glukozu | Glucose, Fasting blood glucose, "Glukoz" | mg/dL / mmol/L | mmol/L = mg/dL × 0.0555 (MLP: 70–99 = 3.9–5.5) | 70–99 mg/dL açlık | [21] | (bağlam) | kaynak doğrulanmadı |
| 18 | Kreatinin | Creatinine, Cr, "Krea" | mg/dL / µmol/L | µmol/L ≈ mg/dL × 88.4 (MLP: 0.7–1.3 = 62–115) | Erkek 0.7–1.3; Kadın 0.5–0.95 | [22] | (bağlam) | kaynak doğrulanmadı |
| 19 | ALT | Alanine aminotransferase, ALT, SGPT | U/L / µkat/L | µkat/L = U/L ÷ 60 | 4–36 U/L | [24] | (bağlam) | kaynak doğrulanmadı |
| 20 | AST | Aspartate aminotransferase, AST, SGOT | U/L / µkat/L | µkat/L = U/L ÷ 60 | 8–33 U/L | [26] | (bağlam) | kaynak doğrulanmadı |
| 21 | Albümin | Albumin | g/dL / g/L | g/L = g/dL × 10 | 3.4–5.4 g/dL | [26] | (bağlam) | kaynak doğrulanmadı |
| 22 | CRP | C-reactive protein, CRP | mg/L | — | kaynak doğrulanmadı | — | (bağlam) | kaynak doğrulanmadı |
| 23 | Folat / B9 | Folate, Vitamin B9, "Folik asit" | ng/mL | — | kaynak doğrulanmadı | — | Folat (B12 ile birlikte değerlendirilir) | kaynak doğrulanmadı |
| 24 | UIBC/TIBC | Total/unsaturated iron binding capacity | µg/dL / µmol/L | µmol/L = µg/dL × 0.179 | kaynak doğrulanmadı | — | Demir (transferrin doygunluğu bağlamı) | kaynak doğrulanmadı |

> "kaynak doğrulanmadı" hücreleri: bu turda yetkili, birebir doğrulanmış bir referans aralığı toplanamadı. Bu belirteçler için uygulama **yalnızca lab raporundaki aralığı** kullanır; katalog yedeği boş bırakılır ve UI bunu "aralık bilinmiyor" olarak gösterir — sahte aralık gösterilmez.

---

## 3. Takviye ↔ biyobelirteç korelasyon kuralları

Tablodaki her kural: tetik (hangi takviye + hangi belirteç), **nötr metin şablonu** ve kaynak. Metinler "olası/olabilir" dili taşır, tanı ve doz reçetesi içermez; her kart "hekimine sor" ile biter. Kural motoru, mevcut `interaction-review.ts` gibi **deterministik** olmalı (ağ/AI çağrısı yok); bu kurallar derleme zamanında sabittir.

| Kural | Tetik | Nötr metin şablonu (temel) | Kaynak |
|---|---|---|---|
| D3 ↔ 25-OH D | Kullanıcı D3/D2 kullanıyor VE 25-OH D değeri düşük/yetersiz | "25-hidroksi D vitamini değeriniz, raporunuzdaki aralığa göre düşük görünüyor. Kullandığınız D vitamini takviyesinin dozu ve ne zaman tekrar ölçtürülmesi gerektiği hakkında hekiminize danışın." | [1] |
| Demir ↔ Ferritin | Demir takviyesi + ferritin düşük | "Ferritin değeriniz düşük görünüyor; ferritin vücudun demir deposunun bir ölçüsüdür. Demir kullanımınızı ve ek ölçüm ihtiyacını hekiminizle değerlendirin." | [3][11] |
| Demir ↔ Hemoglobin | Demir takviyesi + Hb düşük | "Hemoglobin değeriniz raporunuzdaki aralığın altında görünüyor. Hemoglobin tek başına demir eksikliğini kesin göstermez; hekiminiz ferritin gibi ek ölçümlerle değerlendirir." | [3][13] |
| B12 ↔ B12 | B12 takviyesi + serum B12 normal-altı | "Serum B12 değeriniz normal-altı aralıkta görünüyor. Kesinleştirme için ek ölçüm (örn. metilmalonik asit) gerekebilir; hekiminize danışın." | [2] |
| B12 ↔ MMA | B12 takviyesi + MMA yüksek | "Metilmalonik asit (MMA) değeri, B12 durumunun daha duyarlı bir göstergesidir. Yüksek MMA, böbrek yetmezliği ve ileri yaşta da yükselebilir; yorumu hekiminiz yapmalıdır." | [2] |
| Magnezyum ↔ serum Mg | Magnezyum takviyesi + serum Mg | "Serum magnezyumu, vücuttaki toplam magnezyum durumunu tam yansıtmaz; normal bir serum değeri hücre içi eksikliği dışlamaz. Magnezyum kullanımınızı hekiminizle değerlendirin." | [4] |
| Omega-3 ↔ Trigliserit | Omega-3 takviyesi + trigliserit yüksek | "Omega-3 (EPA/DHA) alımı trigliserit düzeyini düşürebilir; ancak bu genel bilgidir ve sizin doz/tedavi kararınızı hekiminiz vermelidir." | [5] |
| Çinko ↔ Bakır | Çinko takviyesi (yüksek doz/uzun süreli) + bakır düşük | "Yüksek doz ve uzun süreli çinko alımı bakır emilimini etkileyebilir. Bu sizin bakır eksikliğiniz olduğu anlamına gelmez; doz ve süre etiketiyle hekim/eczacı değerlendirmesi gerekir." | [8] |
| Biotin ↔ Immunoassay interferansı | Biotin kullanımı + TSH/troponin (veya diğer immunoassay) ölçümü | "Yüksek doz biotin bazı laboratuvar testlerini etkileyebilir (ör. troponin sonucunun yanlış düşük çıkmasına yol açabilir). Test öncesi biotin kullanımınızı hekiminize/laboratuvara bildirin." | [9] |
| Kalsiyum ↔ serum Ca | Kalsiyum takviyesi + serum Ca dışı değer | "Serum kalsiyumu vücut tarafından sıkı denetlendiği için beslenme durumunu yansıtmayabilir; kalsiyum düzeyindeki sapmanın nedeni genelde başkadır (ör. D vitamini, paratiroid). Hekiminize danışın." | [7] |

**Kapsam dışı (bilinçli eklenmedi):** ilaç-takviye etkileşimleri (warfarin/vitamin K vb.), takviye-takviye çiftlerinin tamamı (yalnızca mevcut `interaction-review.ts` kapsamındakiler), ve kaynağı doğrulanmamış herhangi bir kural. Omega-3 ↔ E vitamini "kanama" iddiası gibi birebir doğrulanmamış ifadeler kural olarak eklenmez (mevcut `interaction-sources.md` ilkesiyle aynı).

---

## 4. Değer çıkarma (PDF / fotoğraf → JSON)

### 4.1 İki yol

| Girdi | Yol | Araç | Maliyet |
|---|---|---|---|
| Metin katmanlı PDF (lab'dan dijital çıktı) | Yerel ayrıştırma → metin → tablo/anahtar-değer çıkarımı | `pdf-parse` (veya eşdeğeri) + deterministik normalizasyon | LLM maliyeti ≈ $0 |
| Taranmış PDF / telefon fotoğrafı | Görüntü → vision LLM → JSON | OpenRouter üzerinden vision modeli | Bölüm 4.3 |

Türkiye'deki büyük lab'ların (ör. hastane LIS, özel lab) dijital raporları genelde metin katmanlı PDF verir; fotoğraf yolu kâğıt çıktılar için yedek. Önce PDF'in metin katmanı denenir; metin yoksa/boşsa vision yoluna geçilir.

### 4.2 Vision modeli karşılaştırması (OpenRouter, 2026-11-01 canlı API verisi)

Fiyatlar `/api/v1/models` uç noktasından okunmuştur (USD/token) [17]. `input_modalities` alanı görüntü desteğini gösterir.

| Model (OpenRouter id) | Görüntü girdisi | Giriş $/1M token | Çıkış $/1M token | Not |
|---|---|---|---|---|
| `google/gemini-3.8-flash` | text+image+video+audio | 0.825 | 4.125 | Google ailesi; yoğun tablo OCR + çok dilli metinde güçlü bilinirlik. **Birincil aday.** |
| `anthropic/claude-haiku-5.5` | text+image | 0.10 | 0.50 | Güçlü vision + çok dilli; büyük isteklerde (≥100k prompt token) fiyat artar. **Alternatif.** |
| `deepseek/deepseek-v4.1-flash` | text+image | 0.045 | 0.50 | DeepSeek'in yeni görüntü desteği (bir kardeş modeli `deepseek-v4-flash-vision-exp` "exp" olarak işaretli). En ucuz ama yoğun tablo OCR güvenilirliği henüz kanıtlanmadı. **En ucuz aday.** |
| `qwen/qwen3.8-omni-flash` | text+image+audio+video | 0.15 | 0.47 | Qwen ailesi; doküman anlama + çok dilli güçlü; ucuz. **Yedek.** |

**Seçim:** Birincil `gemini-3.8-flash` (OCR güvenilirliği + Türkçe), hacimli/ucuz akış için `deepseek-v4.1-flash` veya `qwen3.8-omni-flash` ile A/B testi yapılır; yeterli doğrulukta olan en ucuz model seçilir.

**Dürüst sınır:** "Türkçe laboratuvar raporu tablosu okuma doğruluğu" için kamuya açık bir kıyaslama/bencmark bulunamadı (kaynak doğrulanmadı). Yukarıdaki sıralama model ailelerinin bilinen OCR/çok dilli gücüne dayanır, ölçülmüş bir Türkçe-lab doğruluğu değil. Yayın öncesi kendi Türkçe lab örnek setiyle ölçüm zorunludur.

### 4.3 Rapor başına maliyet tahmini

Varsayımlar (tahmin): rapor başına 1–3 sayfa görüntüsü; görüntü tokenizasyonu sağlayıcıya/çözünürlüğe göre değişir; ~2.000–3.000 giriş tokenı + ~800 çıkış tokenı (JSON). Metin katmanlı PDF için LLM maliyeti yoktur.

| Model | Rapor başına tahmin | 1.000 rapor/ay |
|---|---|---|
| `gemini-3.8-flash` | ≈ $0.005 | ≈ $5 |
| `qwen3.8-omni-flash` | ≈ $0.0007 | ≈ $0.70 |
| `deepseek-v4.1-flash` | ≈ $0.0005 | ≈ $0.50 |
| `claude-haiku-5.5` | ≈ $0.0006 | ≈ $0.60 |

> Bunlar büyüklük sırası tahminidir (bazı sağlayıcılar görüntüyü token yerine görüntü başına ücretlendirir; kesin birimler model kartında değişebilir) [17]. Çıkarım sırasında gerçek token kullanımı loglanıp doğrulanmalıdır.

### 4.4 Çıktı JSON şeması

```json
{
  "report_date": "2026-10-15",
  "lab_name": "…",                          // varsa; kimlik (ad, TC, protokol) MASKELE
  "results": [
    {
      "analyte": "25-Hidroksi D Vitamini",
      "value": 18.4,
      "unit": "ng/mL",
      "ref_low": 30.0,
      "ref_high": 100.0,                     // lab raporundan; yoksa null → katalog yedeği
      "flag": "low",                          // low | high | normal | unknown
      "raw_text": "D Vitamini (25-OH) 18.4 ng/mL 30-100",  // modelin değeri okuduğu HAM metin
      "confidence": 0.94
    }
  ]
}
```

- `flag` **her zaman lab'ın `ref_low`/`ref_high`'ına göre** hesaplanır; katalog aralığı yalnızca bu ikisi yoksa ve kullanıcı onayladıysa kullanılır.
- `raw_text` alanı zorunludur: değer–ham metin doğrulaması için (aşağıda).

### 4.5 Halüsinasyona karşı savunma

1. **Değer ↔ ham metin doğrulaması:** Modelin ürettiği `value`, `raw_text` içinde ayrıştırılabilir mi kontrol edilir (regex/sayı eşleşmesi). Eşleşmiyorsa sonuç "düşük güven" olarak işaretlenir.
2. **`confidence` eşiği:** Düşük güvenli sonuçlar otomatik kaydedilmez.
3. **Kullanıcı onay ekranı (zorunlu):** Tüm çıkarılan değerler kaydedilmeden önce "şunları okudum, doğru mu?" ekranında tek tek düzeltilebilir şekilde gösterilir. Onaysız değer hiçbir korelasyona girmez.
4. **İmza doğrulama:** Vision modelinden yalnızca JSON istenir; serbest metin açıklaması istenmez (tanı/ifade üretimini kısıtlar).
5. **Kimlik maskeleme:** LLM'e gönderilmeden önce ad-soyad, TC kimlik no, protokol no, kurum/telefon gibi alanlar yerel olarak maske/replace edilir (Bölüm 5).

---

## 5. KVKK — özel nitelikli sağlık verisi gereksinimleri

Kan tahlili raporu ve çıkarılan değerler **özel nitelikli kişisel veri** (sağlık verisi) kapsamındadır (KVKK m.6) [18].

### 5.1 İşleme hukuki sebebi
- Özel nitelikli sağlık verisinin işlenmesi kural olarak **açık rızaya** dayanır (KVKK m.6/2) [18].
- Aydınlatma (m.10) açık rızadan ayrı bir yükümlülüktür; ikisi de ayrı ayrı yerine getirilmelidir (mevcut `kvkk.ts` aydınlatma metni v1.0 bu modül için de güncellenmeli: kan tahlili dosyası, çıkarılan değerler ve LLM'e gönderim amaçları eklenmeli).

### 5.2 Yurt dışına aktarım (m.9 — 2024 değişikliği sonrası)
- KVKK m.9, 7499 sayılı Kanun ile değiştirildi (12.03.2024 RG; değişiklikler 01.06.2024 yürürlükte) [10].
- Yeni düzende aktarım için: (a) yeterlilik kararı, yoksa (b) **uygun güvenceler** — "standart sözleşmeler" ve "bağlayıcı şirket kuralları" — ve bunların yokluğunda (c) sınırlı sayıdaki istisnai haller [10].
- LLM sağlayıcıları (ABD/Çin kaynaklı) için yeterlilik kararı bulunmadığı varsayımıyla, **standart sözleşme** (ve 5 iş günü içinde Kurul'a bildirim) yolu öne çıkar [10]. Ayrıca açık rıza tek başına aktarımı meşrulaştıran "istisnai hal" olarak dikkatli kullanılmalıdır; ticari sürümde hukuki inceleme şarttır.
- Mevcut `kvkk.ts` metninde "KVKK m.9 uyarınca açık rıza" ifadesi, 2024 sonrası yeni düzene göre gözden geçirilmelidir (standart sözleşme/bildirim yükümlülüğü eklenmeli) [10].

### 5.3 Veri minimizasyonu ve güvenlik önlemleri
- **Kimlik maskeleme:** LLM'e gönderilen görüntü/metinden ad, soyad, TC kimlik no, protokol no, telefon, kurum adı gibi tanımlayıcılar çıkarım öncesi yerel olarak maske/replace edilir. LLM yalnızca analit adı, değer, birim ve aralık görür.
- **Orijinal dosya:** Çıkarım tamamlandıktan ve değerler kullanıcı tarafından onaylandıktan sonra orijinal PDF/fotoğrafı **sunucudan silme seçeneği** sunulur (varsayılan: kısa saklama + kullanıcı silme kontrolü).
- **Şifreleme:** Depolama (at-rest) şifreli (Supabase storage/DB), taşımada TLS; LLM sağlayıcıya "eğitimde kullanma / saklama" talimatı verilir (mevcut aydınlatma metnindeki ifade korunur).
- **Saklama/silme:** İşleme amacı ortadan kalkınca veya kullanıcı talebinde silinir/yok edilir/anonimleştirilir (KVKK m.7 ve mevcut aydınlatma metni ilkesi). Çıkarılan değerler kullanıcının kendi hesabında trend için saklanır; kullanıcı istediğinde tümü silinebilir.

### 5.4 Açıkça iddia edilmeyenler
- "KVKK %100 uyumlu / Kurum onaylı" denmez; bu tür beyan için denetim yoktur. Ticari sürüm öncesi veri sorumlusu kimliği, saklama süresi, aktarım sözleşmeleri ve bildirimler hukuki incelemeyle tamamlanır (mevcut `turkiye-usage-information.md` ilkesiyle aynı).

---

## 6. Veri modeli (Supabase — SQL taslağı)

Own-row RLS: kullanıcı yalnızca kendi satırlarını görür/düzenler/siler.

```sql
-- Laboratuvar raporu üst kaydı
create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  report_date date,                        -- rapordaki tahlil tarihi
  source_type text not null check (source_type in ('text_pdf','scanned','photo')),
  storage_path text,                       -- Supabase Storage nesne yolu
  original_filename text,
  status text not null default 'processing'
    check (status in ('processing','pending_review','confirmed','deleted')),
  original_deleted boolean not null default false,  -- çıkarım sonrası orijinal silindi mi
  lab_name_masked text,                    -- kimlik maskeli lab adı (isteğe bağlı)
  extraction_model text,                   -- hangi modelle çıkarıldı
  extraction_cost_usd numeric               -- gerçek token/ücret logu
);

-- Çıkarılan / onaylanan sonuçlar
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lab_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analyte_code text not null,              -- katalogdaki stabil kod
  analyte_name_raw text,                   -- raporda okunan ham ad
  value numeric,
  value_original text,                     -- "18,4" gibi ham metin
  unit text,
  ref_low numeric, ref_high numeric,       -- LAB aralığı (öncelik)
  ref_source text not null default 'lab'
    check (ref_source in ('lab','catalog')),
  flag text not null check (flag in ('low','high','normal','unknown')),
  raw_text text not null,                  -- modelin değeri okuduğu ham metin (doğrulama için)
  confidence numeric,                      -- 0..1
  confirmed boolean not null default false, -- kullanıcı onay ekranından geçti mi
  created_at timestamptz not null default now()
);

create index if not exists lab_reports_user_idx on public.lab_reports(user_id, created_at desc);
create index if not exists lab_results_user_idx on public.lab_results(user_id, analyte_code, created_at desc);

-- Own-row RLS
alter table public.lab_reports enable row level security;
alter table public.lab_results enable row level security;

create policy "own lab_reports" on public.lab_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lab_results" on public.lab_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Notlar:
- Orijinal dosya Supabase **Storage**'a konur; bucket RLS'i de own-row ilkesiyle kısıtlanır (üst tablo `storage_path`'i işaret eder). `original_deleted=true` olduğunda nesne silinir, yalnız `lab_results` kalır.
- `extraction_cost_usd` ve `extraction_model` gerçek token kullanımından loglanır (Bölüm 4.3'teki tahminlerin doğrulanması için).
- Korelasyon katmanı ayrı tablo gerektirmez: `lab_results` (onaylı) ile kullanıcının mevcut takviye envanteri çalışma anında, Bölüm 3'teki deterministik kurallarla eşleştirilir.

---

## 7. UX akışı

1. **Yükle:** "Kan tahlili ekle" → dosya/PDF veya fotoğraf seç. Burada kısa KVKK rıza/aydınlatma onayı (bu modüle özel, `kvkk.ts` v1.0'ın üzerine eklenen amaç maddesiyle). Otomatik işaretli onay kutusu YOK.
2. **İşleniyor:** İlerleme durumu ("Rapor okunuyor…"). Metin katmanlı PDF ise anlık; görüntü ise LLM çağrısı.
3. **"Şunları okudum, doğru mu?" (onay ekranı):** Çıkarılan her değer; analit adı, değer, birim, lab aralığı, işaret (renk), yanında `raw_text` (kullanıcı doğrulayabilsin diye) ve düzenleme alanı. Düşük güvenli satırlar belirgin işaretlenir. Kullanıcı düzeltir/onaylar; **onaysız değer hiçbir korelasyona girmez ve kaydedilmez.**
4. **Sonuç kartları:** Onaylı değerler renk kodlu (düşük = mavi/turuncu, normal = nötr, yüksek = turuncu/kırmızı ton) ama **nötr dil** ile: "Değeriniz, raporunuzdaki referans aralığın altında" — "eksikliğiniz var" değil. Her kartta kaynak + "hekimine sor" bağlantısı.
5. **Takviye korelasyonu:** Kullanıcının mevcut takviyeleriyle Bölüm 3 kuralları çalışır; "D3 kullanıyorsunuz + 25-OH D düşük" gibi kartlar bilgi verir. "Kırmızı bayrak" durumunda (Bölüm 1.2) "acil hekim" uyarısı öne çıkar.
6. **Trend:** Aynı belirtecin zaman içindeki değerleri mini grafik olarak gösterilir (yalnızca ≥2 onaylı ölçüm varsa).
7. **Rapora ekle:** Sonuçlar, mevcut "Sağlık özeti PDF" raporuna ayrı bir "Kan tahlili" bölümü olarak eklenir (değerler + işaretler + korelasyon notları + kaynaklar).

---

## 8. Fazlama ve maliyet

| Faz | Kapsam | Bağımlılık / maliyet |
|---|---|---|
| **Faz 0 — Katalog + kurallar** | Bölüm 2 kataloğu, birim çarpanları, Bölüm 3 korelasyon kuralları (deterministik TS modülü, `interaction-review.ts` deseninde), lab-aralığı-öncelikli işaretleme fonksiyonu | LLM yok; $0 |
| **Faz 1 — Metin katmanlı PDF** | `pdf-parse` ile ayrıştırma, `lab_reports`/`lab_results` + RLS, onay ekranı, sonuç kartları, trend, rapora ekleme | LLM yok; $0. En yüksek değer/risk oranı. |
| **Faz 2 — Vision (taranmış/fotoğraf)** | OpenRouter vision modeli, JSON şeması, kimlik maskeleme, değer–ham metin doğrulaması, maliyet logu | Bölüm 4.3; rapor başına ≈ $0.0005–0.005 |
| **Faz 3 — İyileştirme** | Model A/B (ucuz aday seçimi), Türkçe lab örnek setiyle doğruluk ölçümü, kritik değer UX iyileştirmesi | Veri seti + ölçüm maliyeti |

**Sıralama gerekçesi:** Faz 0–1 hiç LLM maliyeti olmadan çekirdek değeri (değer oku → lab aralığına göre işaretle → takviye korelasyonu → hekime yönlendir) verir; vision yolu yalnızca kâğıt çıktı kullanıcıları için sonradan eklenir.

---

## Yönetici özeti

LongevityAI "Kan Tahlili" modülü, kullanıcının yüklediği tahlil raporunu okur, her değeri **öncelikle lab'ın kendi referans aralığına** göre düşük/yüksek/normal işaretler (katalog aralığı yalnızca yedek), kullanıcının mevcut takviyeleriyle NIH ODS kaynaklı deterministik kurallar üzerinden korelasyon kurar ve sonucu "bilgi + hekimine sor" formatında, mevcut sağlık özeti PDF'ine bölüm olarak ekler. Tıbbi sınır açıktır: tanı, tedavi ve kişisel doz önerisi yok; belirgin sapmada "acil hekim" yönlendirmesi var. Değer çıkarma iki yolludur — metin katmanlı PDF yerel ayrıştırıcıyla (LLM maliyeti $0), taranmış/fotoğraf ise OpenRouter vision modeliyle (birincil aday `gemini-3.8-flash`, rapor başına ≈ $0.005; en ucuz aday `deepseek-v4.1-flash` ≈ $0.0005). KVKK açısından veri özel nitelikli sağlık verisidir (m.6, açık rıza); yurt dışına LLM aktarımı m.9'un 7499 sayılı Kanun sonrası düzenine (standart sözleşme + bildirim) tabidir; LLM'e gönderim öncesi kimlik maskeleme ve çıkarım sonrası orijinal dosya silme önerilir. Modül "tanı/tahmin amacı taşımayan wellbeing yazılımı" çizgisinde kaldığı için MDR/TİTCK tıbbi cihaz riski düşük tutulur. Katalogda 24 belirteç tanımlı; takviye ilişkili olanlar (D, B12/MMA, ferritin/Hb, Mg, Zn/Cu, Ca, trigliserit) tam kaynaklı, bazı klinik kimya belirteçleri (CRP, folat, TIBC) kaynak doğrulanamadığı için yalnızca lab aralığıyla çalışacak şekilde "kaynak doğrulanmadı" işaretlidir.

## Açık riskler

1. **OCR/vision doğruluğu ölçülmedi.** Türkçe lab tablosu okuma için kamuya açık benchmark yok (kaynak doğrulanmadı); yayın öncesi kendi örnek setiyle doğruluk ölçümü zorunlu. Yanlış okunan değer, yanlış "düşük/yüksek" işaretine ve yanlış korelasyona dönüşür.
2. **Kritik değer eşikleri standardize değil.** Evrensel panik-değer listesi yok (lab/protokol özgü); modül kendi kritik eşiğini uydurmayıp lab işaretine ve sapma büyüklüğüne dayanır — bu, gerçek bir kritik değeri yakalamayabilir.
3. **Katalog aralıklarının eksikliği.** 24 belirtecin bir kısmı için yetkili kaynaktan aralık doğrulanamadı; bunlar yalnızca lab aralığıyla çalışır. Lab aralığı da okunamazsa değer işaretlenemez (bilinçli boşluk).
4. **KVKK m.9 uygulama yükü.** 2024 sonrası standart sözleşme + 5 iş günü bildirim yükümlülüğü gerçek bir operasyonel yüktür; "açık rıza" tek başına aktarımı güvenli biçimde meşrulaştırmayabilir. Ticari sürümde hukuki inceleme şart; mevcut `kvkk.ts` m.9 ifadesinin yeni düzene göre güncellenmesi gerekir.
5. **Biotin/interferans göz ardı riski.** Biotin kullanan kullanıcıda immunoassay sonuçları (TSH, troponin) yanlış olabilir [9]; modül bu uyarıyı verir ama değeri düzeltemez.
6. **Tıbbi cihaz sınırının kayması.** İleride "risk skoru/tahmin" özelliği eklenirse MDR/TİTCK kapsamına girme riski doğar; ürün yol haritasında bu sınırın korunması gerekir [16].
7. **Maliyet tahminleri.** Görüntü tokenizasyonu sağlayıcıya göre değişir; Bölüm 4.3 sayıları büyüklük sırasıdır ve gerçek token loguyla doğrulanmalıdır.

## Sources

[1] https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional — NIH ODS Vitamin D - Health Professional
[2] https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional — NIH ODS Vitamin B12 - Health Professional
[3] https://ods.od.nih.gov/factsheets/Iron-HealthProfessional — NIH ODS Iron - Health Professional
[4] https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional — NIH ODS Magnesium - Health Professional
[5] https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional — NIH ODS Omega-3 - Health Professional
[6] https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional — NIH ODS Zinc - Health Professional
[7] https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional — NIH ODS Calcium - Health Professional
[8] https://ods.od.nih.gov/factsheets/Copper-HealthProfessional — NIH ODS Copper - Health Professional
[9] https://www.fda.gov/medical-devices/in-vitro-diagnostics/biotin-interference-troponin-lab-tests-assays-subject-biotin-interference — FDA (Biotin interference with troponin lab tests)
[10] https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim — KVKK (Yurt Dışına Aktarım)
[11] https://medlineplus.gov/ency/article/003490.htm — MedlinePlus Medical Encyclopedia (Ferritin blood test)
[12] https://medlineplus.gov/ency/article/003684.htm — MedlinePlus Medical Encyclopedia (TSH test)
[13] https://medlineplus.gov/ency/article/003645.htm — MedlinePlus Medical Encyclopedia (Hemoglobin)
[14] https://www.medlineplus.gov/ency/article/003640.htm — MedlinePlus Medical Encyclopedia (A1C test)
[15] https://www.titck.gov.tr/faaliyetalanlari/tibbicihaz/tibbi-cihaz-mevzuati — TİTCK (Tıbbi Cihaz Mevzuatı)
[16] https://eur-lex.europa.eu/eli/reg/2017/745/2023-03-20/eng — EUR-Lex (Regulation (EU) 2017/745 — MDR)
[17] https://openrouter.ai/api/v1/models — OpenRouter Models API (canlı fiyat/modality verisi, 2026-11-01)
[18] https://www.kvkk.gov.tr/Icerik/8183/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber — KVKK (Özel Nitelikli Kişisel Verilerin İşlenmesine İlişkin Rehber)
[19] https://guvenilirgida.tarimorman.gov.tr/Sayfa/Detay/1882 — Tarım ve Orman Bakanlığı GKGM (Takviye Edici Gıda)
[20] https://www.titck.gov.tr/SaglikBeyaniKullanimi — TİTCK (Sağlık Beyanı Kullanımı Hakkında SSS)
[21] https://medlineplus.gov/ency/article/003482.htm — MedlinePlus Medical Encyclopedia (Blood sugar test)
[22] https://medlineplus.gov/ency/article/003475.htm — MedlinePlus Medical Encyclopedia (Creatinine blood test)
[23] https://medlineplus.gov/ency/article/007812.htm — MedlinePlus Medical Encyclopedia (Lipid profile test)
[24] https://medlineplus.gov/ency/article/003473.htm — MedlinePlus Medical Encyclopedia (ALT blood test)
[25] https://medlineplus.gov/ency/article/000403.htm — MedlinePlus Medical Encyclopedia (High blood cholesterol levels)
[26] https://medlineplus.gov/ency/article/003468.htm — MedlinePlus Medical Encyclopedia (Comprehensive metabolic panel)
