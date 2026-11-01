# Türkiye — Kullanım Bilgilendirmesi: Kaynaklar ve Uygulama Notu

Bu belge, `UsageDisclosure` bileşeni ve `/information` sayfasındaki ifadelerin hangi resmî
kaynaklara dayandığını, neyi iddia etmediğini ve yayına çıkmadan önce nelerin
tamamlanması gerektiğini kaydeder.

## 1. Kapsam ve rol

- Bu uygulama bir takviye edici gıda **satıcısı veya üreticisi değildir**; ürün satmaz,
  ürün onayı almaz, etiket üretmez.
- Kullanıcı, kullandığı ürünün etiketindeki miktarı **kendi kaydı** için girer. Uygulama
  miktar hesaplamaz, kişisel doz önermez, yaş/kilo göre uyarlama yapmaz.
- Etiketleme ve sağlık beyanı kuralları doğrudan ürünü piyasaya arz edene uygulanır. Bu
  belgedeki mevzuat alıntıları, uygulamanın kendi yüzeyini bu kurallarla **çelişmeyecek
  biçimde** kurgulamak içindir; uygulamaya "mevzuata tabi üretici" statüsü atfetmez.
- Yapay zekâ sağlayıcısı OpenRouter üzerinden çağrılır. Yanıtlar genel bilgi amaçlıdır;
  tanı, tedavi veya kişisel doz önerisi değildir.

## 2. Resmî kaynaklar ve doğrulanmış alıntılar

**Tarım ve Orman Bakanlığı — GKGM, "Takviye Edici Gıda"** [1]

> Takviye edici gıdalar ilaç değildir.

> Takviye edici gıdalar bir hastalığı önleme ve tedavi etme amacıyla kullanılmaz.

> Takviye edici gıdalar etiketi üzerinde yer alan, kullanıcı grubu (2-4 yaş, 4-10 yaş, 11 yaş ve üzeri) ve günlük tüketilmesi gereken miktara uygun olarak tüketilmelidir.

Bu üç cümle, bileşendeki "ilaç değildir / hastalık önleme-tedavi amacıyla kullanılmaz" ve
"etiket miktarı esastır" ifadelerinin dayanağıdır. Sayfa ayrıca iki yaş altı bebek ve küçük
çocuklar için onay düzenlenmediğini belirtir; bu nedenle uygulama çocuk dozu önermez.

**Tarım ve Orman Bakanlığı — "Takviye Edici Gıdaların Bilinçli ve Güvenli Tüketimi"** [2]

> Önerilen günlük dozu aşmamak için ürün etiketindeki kullanım talimatlarını ve uyarıları dikkatle okuyun.

> Takviye edici gıdalar, yeterli ve dengeli bir beslenmenin alternatifi değildir.

**TİTCK — Sağlık Beyanı Kullanımı Hakkında SSS** [3]

> Paylaşılan bilgilerin yasal olarak bağlayıcılığı bulunmamaktadır.

TİTCK sayfası, sağlık beyanı kullanımına ilişkin soru-cevap metninin kendisinin bağlayıcı
olmadığını açıkça söyler. Bu yüzden uygulamada sağlık beyanı üretilmez; kaynak listesi
bilgilendirme amaçlı verilir, "onaylı ifade" gibi sunulmaz.

**KVKK — Özel Nitelikli Kişisel Verilerin İşlenmesine İlişkin Rehber** [4]

> Kanun’un 6’ncı maddesinin ilk halinde sağlık ve cinsel hayata ilişkin kişisel verilerin, ilgili kişinin açık rızasının alınması durumunda veya kamu sağlığının korunması, koruyucu hekimlik,

Alıntı, rehberin Kanun'un 6. maddesinin önceki metnini anlatan bölümünden alınmıştır ve
cümle yayımdaki hâliyle yarıda kesilir; tamamlanmış bir kural cümlesi gibi aktarılmamalıdır.
Sağlık verisinin özel nitelikli kişisel veri olduğu sonucu bu bölümden doğrulanmaktadır.

**KVKK — Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ** [5]

> İlgili kişinin açık rızasına veya Kanundaki diğer işleme şartlarına bağlı olarak kişisel veri işlendiği her durumda aydınlatma yükümlülüğü yerine getirilmelidir.

Bu cümle, aydınlatmanın açık rızadan ayrı bir yükümlülük olduğunu gösterir. Bu nedenle
`/information` sayfası bir "aydınlatma metni" olarak sunulmaz; veri sorumlusu kimliği ve
iletişim bilgisi olmadan sahte bir aydınlatma metni üretmek yerine eksik olduğu açıkça yazılır.

## 3. Bileşende kullanılan güvenli ifadeler

Kısa yüzey (ana form üstü, iki cümle):

- "Bu alan, kullandığınız ürünün etiketindeki miktarı kaydetmeniz içindir; kişisel
  kullanım veya doz önerisi değildir."
- "Ürün etiketi ile hekiminizin ve eczacınızın planını esas alın."

Açılır bölüm ("Ayrıntılar ve resmî kaynaklar"):

- "Takviye edici gıdalar ilaç değildir; hastalık önleme veya tedavi amacıyla kullanılmaz." [1]
- Etiketin kullanıcı grubunu ve günlük miktarı belirlediği; hamilelik, emzirme, çocukluk
  çağı ve kronik hastalık durumlarında hekime/eczacıya danışılması gerektiği. [1][2]
- Sağlık bilgilerinin özel nitelikli kişisel veri sayıldığı ve paylaşım izninin isteğe
  bağlı olduğu. [4]

Risk grupları (hamilelik, emzirme, çocuk, kronik hastalık, düzenli ilaç) **genel
bilgilendirme** olarak anılır; hiçbir kullanıcıya etiket, tanı veya tedavi çıkarımı
yapılmaz.

## 4. Arayüz kararları

- Bileşen `UsageDisclosure()` — **prop almaz**, varsayılan export. Ana forma Enzo
  tarafından `<UsageDisclosure />` olarak eklenir.
- Ana formda uzun uyarı duvarı yok: iki kısa cümle + "Kullanım bilgisi ve sınırlar"
  başlıklı `<details>` + `/information` bağlantısı.
- Dokunma hedefleri en az 44 px (`summary`, bağlantılar, kaynak satırları), `:focus-visible`
  çerçevesi var, koyu temada `--text-2` / `--text-3` ile okunaklı kontrast.
- Tüm sınıflar `usage-` ve `info-` önekli; global tasarım sistemine dokunulmadı.
- Hiçbir otomatik onay kutusu, ön işaretli izin veya "izin verdiniz" bildirimi yok.
  Paylaşım izni yalnızca Profil ekranındaki mevcut seçenekle yönetilir.
- `/information` sunucu bileşenidir (`metadata` Türkçe); istemci tarafı state kullanmaz.
- Tarih etiketi konmadı; "son güncelleme" gibi doğrulanmamış bir tarih üretilmedi.

## 5. Açıkça iddia edilmeyenler

- "Kanuna %100 uygun", "KVKK uyumlu", "Sağlık Bakanlığı onaylı" **denmez**; bu tür bir
  uygunluk beyanı için denetim/onay yoktur.
- Bu metin hukuki danışmanlık veya uygunluk sertifikası değildir.
- Ürün pazara çıkmadan önce **hukuki inceleme** (aydınlatma metni, açık rıza akışı, saklama
  ve imha, yurt dışına aktarım) ve **klinik inceleme** (ifadelerin sağlık beyanı sayılıp
  sayılmadığı) gerekir.
- Ticari sürüm öncesi doldurulacak alanlar: veri sorumlusu unvanı ve adresi, iletişim
  kanalı, işleme amaçları, alıcı grupları/aktarım, saklama süresi, ilgili kişi hakları ve
  başvuru yöntemi. Bunlar uydurulmadı; sayfada eksik olduğu açıkça yazıldı.

## 6. Doğrulama

- Alıntılar `grounded-citations` ledger'ına (`/root/.hermes/cache/scratch/turkiye-info-ledger.json`)
  verbatim kontrolünden geçerek eklendi; `verify --evidence` temiz.
- `npx tsc --noEmit` hatasız.
- Build, restart ve commit bu görev kapsamında çalıştırılmadı.

## Sources

[1] https://guvenilirgida.tarimorman.gov.tr/Sayfa/Detay/1882 — Takviye Edici Gıda (GKGM)
    > "Takviye edici gıdalar ilaç değildir."
    > "Takviye edici gıdalar bir hastalığı önleme ve tedavi etme amacıyla kullanılmaz."
    > "Takviye edici gıdalar etiketi üzerinde yer alan, kullanıcı grubu (2-4 yaş, 4-10 yaş, 11 yaş ve üzeri) ve günlük tüketilmesi gereken miktara uygun olarak tüketilmelidir."
[2] https://guvenilirgida.tarimorman.gov.tr/Haber/Detay/17132 — Takviye Edici Gıdaların Bilinçli ve Güvenli Tüketimi
    > "Önerilen günlük dozu aşmamak için ürün etiketindeki kullanım talimatlarını ve uyarıları dikkatle okuyun."
    > "Takviye edici gıdalar, yeterli ve dengeli bir beslenmenin alternatifi değildir."
[3] https://www.titck.gov.tr/SaglikBeyaniKullanimi — Sağlık Beyanı Kullanımı Hakkında Sıkça Sorulan Sorular (TİTCK)
    > "Paylaşılan bilgilerin yasal olarak bağlayıcılığı bulunmamaktadır."
[4] https://www.kvkk.gov.tr/Icerik/8183/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber — Özel Nitelikli Kişisel Verilerin İşlenmesine İlişkin Rehber
    > "Kanun’un 6’ncı maddesinin ilk halinde sağlık ve cinsel hayata ilişkin kişisel verilerin, ilgili kişinin açık rızasının alınması durumunda veya kamu sağlığının korunması, koruyucu hekimlik,"
[5] https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig — Aydınlatma Yükümlülüğü Tebliği
    > "İlgili kişinin açık rızasına veya Kanundaki diğer işleme şartlarına bağlı olarak kişisel veri işlendiği her durumda aydınlatma yükümlülüğü yerine getirilmelidir."
