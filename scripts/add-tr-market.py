#!/usr/bin/env python3
"""Türkiye pazarı ürünlerini kataloğa ekler (supplementler.com + vitaminler.com analizinden)."""
import json
from datetime import date

PATH = 'data/supplements.json'
with open(PATH, encoding='utf-8') as f:
    data = json.load(f)

existing = {e['name'] for e in data['entries']}

NEW = [
    # --- Fitness / performans (supplementler.com) ---
    {"name": "ZMA (Çinko + Magnezyum Aspartat)", "category": "kombinasyon", "grade": "C",
     "aliases": ["zma", "zinc magnesium aspartate", "cinko magnezyum"],
     "typicalDose": "gece 1 porsiyon", "timing": "Gece", "withFood": False,
     "avoidWith": [], "note": "Sporcular için çinko+magnezyum+B6. Uyku/testosteron iddiası kanıtı zayıf; mineral ihtiyacını karşılar."},
    {"name": "AOL (Arginin + Ornitin + Lizin)", "category": "aminoasit", "grade": "C",
     "aliases": ["aol", "arginin ornitin lizin", "arginine ornithine lysine"],
     "typicalDose": "üretici dozu", "timing": "Sabah", "withFood": False,
     "avoidWith": [], "note": "Üç aminoasit karışımı; 'büyüme hormonu' iddiası kanıtsız. Arginin/lizin/ornitin kaynağı."},
    {"name": "Et Proteini (Beef Protein)", "category": "protein", "grade": "B",
     "aliases": ["beef protein", "sığır proteini", "et proteini", "et protein tozu"],
     "typicalDose": "20–40 g", "timing": "Öğle", "withFood": False,
     "avoidWith": [], "note": "Sığır kaynaklı protein; süt/laktoz intoleransı için whey alternatifi."},
    {"name": "Whey İzole (Whey Protein Isolate)", "category": "protein", "grade": "A",
     "aliases": ["whey izole", "whey isolate", "izole protein", "isolate protein"],
     "typicalDose": "20–40 g", "timing": "Öğle", "withFood": False,
     "avoidWith": [], "note": "Düşük laktoz/yağ; whey'in saf formu. Laktoz intoleransı olan için uygun."},
    {"name": "Kompleks Protein (Çok Kaynaklı)", "category": "protein", "grade": "A",
     "aliases": ["kompleks protein", "protein blend", "karışık protein", "çok kaynaklı protein"],
     "typicalDose": "20–40 g", "timing": "Öğle", "withFood": False,
     "avoidWith": [], "note": "Farklı protein kaynakları karışımı; emilim hızını zamana yayar."},
    {"name": "Kreatin Kompleks (Blend)", "category": "performans", "grade": "C",
     "aliases": ["kreatin kompleks", "creatine blend", "kompleks kreatin", "kreatin karışımı"],
     "typicalDose": "3–5 g", "timing": "Her saat", "withFood": False,
     "avoidWith": ["böbrek hastalığında hekim onayı"], "note": "Monohidrat dışı form/karışımlar; monohidratın kanıtı daha güçlü ve ucuzdur."},

    # --- Yağ asitleri (vitaminler.com) ---
    {"name": "Omega 3-6-9", "category": "yağ asidi", "grade": "B",
     "aliases": ["omega 369", "omega 3 6 9", "omega 6 9", "omegaz"],
     "typicalDose": "1–2 g", "timing": "Sabah", "withFood": True,
     "avoidWith": ["kan sulandırıcılar (yüksek doz)"], "note": "Üç yağ asidi karışımı; omega-6/9 beslenmede yeterli olduğundan tek başına omega-3 çoğu zaman yeterlidir."},

    # --- Bitkisel / adaptogen (vitaminler.com) ---
    {"name": "Afrika Sardunyası (Pelargonium sidoides)", "category": "bitkisel", "grade": "B",
     "aliases": ["afrika sardunyası", "pelargonium", "umckaloabo", "umca"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": False,
     "avoidWith": ["karaciğer hassasiyeti"], "note": "Üst solunum yolu enfeksiyonu semptomlarına dair bir miktar kanıt; karaciğer hassasiyetinde dikkat."},
    {"name": "Bira Mayası (Brewer's Yeast)", "category": "mikrobiyota", "grade": "B",
     "aliases": ["bira mayası", "brewers yeast", "brewer's yeast", "saccharomyces"],
     "typicalDose": "1–2 yemek kaşığı", "timing": "Sabah", "withFood": True,
     "avoidWith": ["maya alerjisi"], "note": "B vitamini ve krom kaynağı; maya alerjisinde/bağırsakta gaz yapabilir."},
    {"name": "Çin Melek Otu (Dong Quai)", "category": "bitkisel", "grade": "C",
     "aliases": ["dong quai", "çin melek otu", "angelica sinensis"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": False,
     "avoidWith": ["kan sulandırıcı", "östrojen duyarlı durumlar"], "note": "Geleneksel kullanım; kanıtı zayıf. Kan sulandırıcı/östrojenik etkileşim olasılığı."},
    {"name": "Dut Yaprağı Ekstresi", "category": "bitkisel", "grade": "C",
     "aliases": ["dut yaprağı", "mulberry leaf", "morus alba"],
     "typicalDose": "etiket dozu", "timing": "Öğle", "withFood": True,
     "avoidWith": ["diyabet ilacı (hipoglisemi riski)"], "note": "Kan şekeri dengesine dair sınırlı kanıt; diyabet ilacıyla birlikte dikkat."},
    {"name": "Esmer Su Yosunu (Kelp)", "category": "mineral", "grade": "B",
     "aliases": ["kelp", "esmer su yosunu", "deniz yosunu", "kahverengi alg"],
     "typicalDose": "etiket dozu (iyot)", "timing": "Sabah", "withFood": True,
     "avoidWith": ["tiroid hastalığı (hekim onayı)"], "note": "Doğal iyot kaynağı; aşırı alım tiroidi etkileyebilir. Tiroid hastalığında hekim onayı."},
    {"name": "Fitosteroller (Bitkisel Sterol)", "category": "vitamin-benzeri", "grade": "B",
     "aliases": ["fitosterol", "phytosterol", "bitkisel sterol", "plant sterol"],
     "typicalDose": "2 g/gün", "timing": "Öğle", "withFood": True,
     "avoidWith": [], "note": "LDL kolesterolü düşürebilir; yağda çözünen vitamin emilimini azaltabilir."},
    {"name": "Geven (Astragalus)", "category": "adaptogen", "grade": "C",
     "aliases": ["astragalus", "geven", "astragaloside", "huang qi"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": False,
     "avoidWith": ["otoimmün hastalık"], "note": "Bağışıklık destek iddiası karışık; otoimmün hastalıkta dikkat."},
    {"name": "Gotu Kola", "category": "bitkisel", "grade": "C",
     "aliases": ["gotu kola", "centella asiatica", "asiatic pennywort"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": False,
     "avoidWith": ["karaciğer hastalığı"], "note": "Geleneksel kullanım; kanıtı sınırlı. Karaciğer etkileşimi bildirilmiştir."},
    {"name": "Hatmi (Marshmallow Root)", "category": "bitkisel", "grade": "C",
     "aliases": ["hatmi", "marshmallow root", "althaea officinalis", "hatmi çiçeği"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": True,
     "avoidWith": [], "note": "Mukoza yatıştırıcı geleneksel kullanım; kanıtı sınırlı."},
    {"name": "Hindiba Ekstresi (Chicory)", "category": "prebiyotik", "grade": "C",
     "aliases": ["hindiba", "chicory", "cichorium intybus", "inulin kaynağı"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": True,
     "avoidWith": [], "note": "İnülin kaynağı (prebiyotik); gaz/şişkinlik yapabilir."},
    {"name": "Kabak Çekirdeği Yağı", "category": "yağ", "grade": "C",
     "aliases": ["kabak çekirdeği yağı", "pumpkin seed oil", "cucurbita", "kabak çekirdeği"],
     "typicalDose": "1–2 g", "timing": "Sabah", "withFood": True,
     "avoidWith": [], "note": "Fitosterol/çinko kaynağı; prostat iddiası kanıtı sınırlı."},
    {"name": "Yeşil Kahve Ekstresi (Green Coffee)", "category": "bitkisel", "grade": "C",
     "aliases": ["yeşil kahve", "green coffee", "chlorogenic acid", "klorojenik asit", "kahve çekirdeği"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": False,
     "avoidWith": [], "note": "Klorojenik asit kaynağı; kilo iddiası kanıtı zayıf. Kafein içerir."},
    {"name": "Karamuk (Berberis vulgaris)", "category": "bitkisel", "grade": "C",
     "aliases": ["karamuk", "berberis", "barberry", "berberis vulgaris"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": True,
     "avoidWith": ["kan şekeri düşüren ilaçlar"], "note": "Berberin kaynağı bitki; berberin ekstresi katalogda ayrıca listelenir."},
    {"name": "Kekik Yağı (Oregano Oil)", "category": "bitkisel", "grade": "C",
     "aliases": ["kekik yağı", "oregano oil", "origanum vulgare", "karvakrol"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": True,
     "avoidWith": ["mide hassasiyeti"], "note": "Karvakrol/timol kaynağı; antimikrobiyal iddia kanıtı sınırlı, mide hassasiyeti yapabilir."},
    {"name": "Kişniş (Coriander)", "category": "bitkisel", "grade": "C",
     "aliases": ["kişniş", "coriander", "cilantro", "kişniş yağı", "coriandrum"],
     "typicalDose": "etiket dozu", "timing": "Sabah", "withFood": True,
     "avoidWith": [], "note": "Geleneksel sindirim kullanımı; kanıtı sınırlı."},
    {"name": "Nar Çekirdeği Yağı (Pomegranate Seed)", "category": "yağ", "grade": "C",
     "aliases": ["nar çekirdeği yağı", "pomegranate", "punica granatum", "punisik asit"],
     "typicalDose": "1–2 g", "timing": "Sabah", "withFood": True,
     "avoidWith": [], "note": "Punikik asit kaynağı; antioksidan iddiası sınırlı."},
]

added = 0
for e in NEW:
    if e['name'] in existing:
        continue
    data['entries'].append(e)
    existing.add(e['name'])
    added += 1

data['updated'] = date.today().isoformat()
with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Eklenen yeni kayıt: {added}")
print(f"Toplam kayıt: {len(data['entries'])}")
