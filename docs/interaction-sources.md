# Birlikte kullanım paneli — kaynaklar ve kapsam sınırları

Bu belge, `src/components/interaction-panel.tsx` panelinin gösterdiği kuralların nereden
geldiğini, hangi koşullarda geçerli olduğunu ve **neyi iddia etmediğini** kaydeder.
Kural motoru: `src/lib/interaction-review.ts`. Test: `scripts/test-interaction-review.cjs`.

Panel çalışma anında ağ veya AI çağrısı yapmaz; kurallar derleme zamanında sabittir ve
çıktı deterministiktir.

## Kaynaklar

İki kaynak kullanılıyor: NIH Office of Dietary Supplements (ODS) "Health Professional"
fact sheet'leri. Her ikisi de kamuya açık, tarihli ve düzenli güncellenen referans
materyalleridir.

| Ledger id | Kaynak | URL |
|---|---|---|
| 1 | NIH ODS — Iron Fact Sheet | https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/ |
| 2 | NIH ODS — Copper Fact Sheet | https://ods.od.nih.gov/factsheets/Copper-HealthProfessional/ |

Alıntılar `grounded-citations` ledger'ında tutuldu:
`/root/.hermes/cache/scratch/interaction-ledger.json` (bu göreve özel; başka agent'ların
ledger'ı sıfırlanmadı). Her alıntı, çekilen sayfa metninde **birebir** bulunduğu
doğrulanarak eklendi (`sources.py quote ... --from <sayfa metni>`); alıntı metni
sayfada geçmezse araç kaydı reddediyor.

## Kapsamdaki kurallar

### 1. Kalsiyum + demir — olası emilim etkisi

- **Dayanak:** "Unlike other inhibitors of iron absorption, calcium might reduce the
  bioavailability of both nonheme and heme iron."[1]
- **Pratik öneri (kaynağın kendi ifadesi):** "In addition, experts recommend taking
  calcium and iron supplements at different times to avoid potential interference with
  the absorption of iron."[1]
- **Sınırlama (aynı kaynak):** "Calcium might interfere with the absorption of iron,
  although this effect has not been definitively established"[1]; ayrıca "the effects of
  enhancers and inhibitors of iron absorption are attenuated by a typical western
  diet"[1] ve etki "have little effect on most"[1] kişilerin demir durumunda.
- **Panelin söylemediği:** Belirli bir saat aralığı (ör. "2 saat arayla") **yok**.
  Kaynak yalnızca "farklı saatlerde" diyor; panel bu ifadeyi korur, saat uydurmaz.
  Doz eşiği de iddia edilmez.

### 2. Yüksek doz / uzun süreli çinko + bakır — koşullu bağlam

- **Dayanak:** "High dietary intakes of zinc can interfere with copper absorption, and
  excessive use of zinc supplements can lead to copper deficiency."[2]
- **Koşul ve ölçek (kaynakta yazdığı gibi):** "Reductions in erythrocyte copper-zinc
  superoxide dismutase, a marker of copper status, have been reported with even
  moderately high zinc intakes of approximately 60 mg/day for up to 10 weeks"[2];
  yetişkin üst sınırı için "the FNB established the UL for zinc at 40 mg/day for
  adults"[2].
- **Panelin söylemediği:** Kullanıcının mevcut kullanımının riskli olduğu veya bakır
  eksikliği olduğu **söylenmez**. İki kayıt aynı listede diye kişisel risk hükmü
  üretilmez; metin açıkça "anlamına gelmez" der ve doz/süre değerlendirmesini hekime
  bırakır. Kullanıcının girdiği doz metni ayrıştırılmaz, bu eşiklerle karşılaştırılmaz.

### 3. Demir + C vitamini — emilim artışı bilgisi

- **Dayanak:** "The bioavailability of iron is approximately 14% to 18% from mixed diets
  that include substantial amounts of meat, seafood, and vitamin C (ascorbic acid, which
  enhances the bioavailability of nonheme iron)"[1].
- **Ayrım:** Bu bir **"güvenli kombinasyon" veya "birlikte alın" önerisi değildir**.
  Emilim artışı, demir ihtiyacı ve dozu hakkında karar anlamına gelmez; panel bunu
  metinde açıkça yazar. Yüzde/etki büyüklüğü iddiası üretilmez.

## Kapsam DIŞI (bilinçli olarak eklenmedi)

Aşağıdakiler için bu turda yetkili kaynaktan birebir doğrulanmış ifade toplanmadı;
bu yüzden kural olarak **eklenmedi**. Model bilgisiyle çift eklemek yasak:

- Omega-3 + E vitamini kanama iddiası (genel kanama uyarısı olarak yaygın, doğrulanmadı).
- "Normal D vitamini + magnezyum herkes için gerekli/riskli" türü çıkarımlar.
- Demir ↔ D3+K2, D3+K2 ↔ warfarin gibi geçmişte yanlış pozitif üreten heuristikler.
  Warfarin/vitamin K etkileşimi gerçek bir klinik konudur ama bu panelin kapsamı değildir;
  ilaç listesi hiç incelenmiyor.
- Katalogdaki `avoidWith` alanı. Bu alan "şu ilaçla etkileşir" bilgisi taşır; iki
  takviyenin birbiriyle çakıştığı anlamına gelmez (eski bug'ın kaynağı buydu). Panel
  katalog alanlarını okumaz; yalnız ürün **adı** üzerinden dar bir sözlük kullanır.

## Ad tanıma (normalizasyon)

- Türkçe küçük harf + aksan/noktalama normalizasyonu, sonra **token dizisi** üzerinde
  tam ifade eşleşmesi. Alt-dize araması yok.
- Tanınan aileler: `demir`, `kalsiyum`, `c-vitamini`, `cinko`, `bakir`.
  Örnek alias'lar: "Demir", "Demir Bisglisinat", "Ferrous Fumarat"; "Kalsiyum Sitrat";
  "C Vitamini", "Askorbik Asit", "Vitamin C"; "Çinko Pikolinat"; "Bakır".
- Tek harfli `c` / `d` araması **yok**: "C Vitamini" iki token'lık ifadedir, "D Vitamini"
  veya "K2+D3" C vitamini sayılmaz. "Demirhindi" gibi kelimeler demir sayılmaz.
- Marka/adı tanınmayan kayıtlar "İncelenemeyen kayıtlar" başlığı altında **adlarıyla ve
  sayısıyla** gösterilir; güvenli sayılmaz, sessizce yutulmaz.

## Panelin sınırları (kullanıcıya gösterilenler)

- Etiket: **"Kaynaklı olası etkileşim"** — tanı, kesinlik veya yüzde risk iddiası değil.
- İlaç uyarısı: "İlaç listesi incelenmiyor. Düzenli ilaç (ör. kan sulandırıcı, tansiyon,
  tiroid) kullanıyorsanız bu panel yeterli değildir; hekim veya eczacıya danışın."
- Kapsam notu: "Bu panel sınırlı sayıda kaynaklı kuralı denetler; birlikte kullanım için
  güvenlik onayı değildir."
- Eşleşme yoksa: "Bu sınırlı kurallarda eşleşme bulunmadı; birlikte kullanım için
  güvenlik onayı değildir." — bu bir "yeşil/güvenli" işareti değildir.
- İki kayıttan az envanterde çift değerlendirmesi yapılmaz; hiçbir çift "kontrol edildi"
  sayılmaz ve panel bunu söyler.
- Çift sayısı `MAX_PAIRS` (6) ile sınırlı; kesilen çift sayısı panelde açıkça yazılır.
- Kullanıcının girdiği doz metni yalnız "Etiketteki doz" etiketiyle, olduğu gibi gösterilir.
  Birim çevrilmez, toplanmaz, kişisel doz veya risk çıkarımı yapılmaz.

## Testler

`node scripts/test-interaction-review.cjs` (89 assertion) şunları doğrular: kaynak
kimlikleri ve https URL'leri, kalsiyum+demir koşulu ve uydurulmuş saat aralığının
yokluğu, çinko+bakır koşullu metni, demir+C vitamini "onay değildir" ifadesi, alias'larda
AB/BA tekrarı olmaması, D3+K2 + demir için warfarin yanlış pozitifi olmaması, bilinmeyen
adların güvenli sayılmaması, <2 kayıt boş durumu, üst sınırda şeffaflık ve dozaj metninin
ayrıştırılmaması.

## Sources

[1] https://ods.od.nih.gov/factsheets/Iron-HealthProfessional — NIH ODS Iron - Health Professional Fact Sheet
    > "Unlike other inhibitors of iron absorption, calcium might reduce the bioavailability of both nonheme and heme iron."
    > "In addition, experts recommend taking calcium and iron supplements at different times to avoid potential interference with the absorption of iron."
    > "The bioavailability of iron is approximately 14% to 18% from mixed diets that include substantial amounts of meat, seafood, and vitamin C (ascorbic acid, which enhances the bioavailability of nonheme iron)"
    > "However, the effects of enhancers and inhibitors of iron absorption are attenuated by a typical western diet"
    > "Calcium might interfere with the absorption of iron, although this effect has not been definitively established"
    > "have little effect on most"
    > "For this reason, experts suggest that people take individual calcium and iron supplements at different times of the day"
[2] https://ods.od.nih.gov/factsheets/Copper-HealthProfessional — NIH ODS Copper - Health Professional Fact Sheet
    > "High dietary intakes of zinc can interfere with copper absorption, and excessive use of zinc supplements can lead to copper deficiency."
    > "Reductions in erythrocyte copper-zinc superoxide dismutase, a marker of copper status, have been reported with even moderately high zinc intakes of approximately 60 mg/day for up to 10 weeks"
    > "This is one reason the FNB established the UL for zinc at 40 mg/day for adults"
