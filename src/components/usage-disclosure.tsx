import Link from "next/link"
import "./usage-disclosure.css"

/**
 * Kullanım bilgisi ve sınırlar.
 * Kısa, sakin bir bilgilendirme şeridi; ürün etiketindeki miktarın kaydı içindir.
 * Kişisel doz önerisi, tanı veya tedavi iddiası taşımaz.
 * Resmî dayanaklar: GKGM (Tarım ve Orman Bakanlığı) takviye edici gıda bilgilendirmesi,
 * TİTCK sağlık beyanı SSS, KVKK özel nitelikli veri rehberi ve aydınlatma tebliği.
 */
export default function UsageDisclosure() {
  return (
    <section className="usage-disclosure" aria-labelledby="usage-disclosure-title">
      <h2 id="usage-disclosure-title" className="usage-disclosure__title">
        Kullanım bilgisi ve sınırlar
      </h2>

      <p className="usage-disclosure__lead">
        Bu alan, kullandığınız ürünün etiketindeki miktarı kaydetmeniz içindir; kişisel
        kullanım veya doz önerisi değildir.
      </p>
      <p className="usage-disclosure__lead">
        Ürün etiketi ile hekiminizin ve eczacınızın planını esas alın.
      </p>

      <details className="usage-disclosure__details">
        <summary className="usage-disclosure__summary">Ayrıntılar ve resmî kaynaklar</summary>

        <div className="usage-disclosure__body">
          <p>
            Takviye edici gıdalar ilaç değildir; hastalık önleme veya tedavi amacıyla
            kullanılmaz.
          </p>
          <p>
            Etiket, kullanıcı grubunu ve günlük tüketim miktarını belirtir. Hamilelik,
            emzirme, çocukluk çağı ve kronik hastalık gibi durumlarda ürünü kullanmadan
            önce hekiminize veya eczacınıza danışın. Bu uygulama tanı koymaz, tedavi
            önermez.
          </p>
          <p>
            Sağlıkla ilgili bilgiler özel nitelikli kişisel veri sayılır. Uygulamadaki
            paylaşım izni isteğe bağlıdır ve Profil ekranından kapatılabilir.
          </p>

          <Link className="usage-disclosure__link" href="/information">
            Bilgilendirme sayfasını aç
          </Link>

          <ul className="usage-disclosure__sources">
            <li>
              <a
                href="https://guvenilirgida.tarimorman.gov.tr/Sayfa/Detay/1882"
                target="_blank"
                rel="noreferrer noopener"
              >
                Tarım ve Orman Bakanlığı — Takviye Edici Gıda
              </a>
            </li>
            <li>
              <a
                href="https://www.titck.gov.tr/SaglikBeyaniKullanimi"
                target="_blank"
                rel="noreferrer noopener"
              >
                TİTCK — Sağlık Beyanı Kullanımı Hakkında SSS
              </a>
            </li>
            <li>
              <a
                href="https://www.kvkk.gov.tr/Icerik/8183/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber"
                target="_blank"
                rel="noreferrer noopener"
              >
                KVKK — Özel Nitelikli Kişisel Verilerin İşlenmesine İlişkin Rehber
              </a>
            </li>
          </ul>
        </div>
      </details>
    </section>
  )
}
