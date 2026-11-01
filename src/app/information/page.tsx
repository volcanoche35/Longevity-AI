import type { Metadata } from "next"
import Link from "next/link"
import UsageDisclosure from "@/components/usage-disclosure"
import "@/components/usage-disclosure.css"

export const metadata: Metadata = {
  title: "Kullanım bilgisi ve sınırlar — LongevityAI",
  description:
    "Takviye kayıtlarının ne için tutulduğu, bilginin sınırları ve sağlık bilgilerinin paylaşımı hakkında sade bilgilendirme.",
}

export default function InformationPage() {
  return (
    <main className="info-page">
      <header className="info-head">
        <p className="info-kicker">BİLGİLENDİRME</p>
        <h1>Kullanım bilgisi ve sınırlar</h1>
        <p className="info-intro">
          Bu sayfa, uygulamadaki miktar kaydının ne anlama geldiğini ve hangi bilgilerin
          nerede kaldığını sade biçimde açıklar. Hekim muayenesinin, eczacı danışmanlığının
          veya ürün etiketinin yerini almaz.
        </p>
      </header>

      <section className="info-section" aria-labelledby="info-miktar">
        <h2 id="info-miktar">1. Miktar kaydı</h2>
        <p>
          Girdiğiniz miktar, kullandığınız ürünün etiketinde yazan miktarı not etmeniz
          içindir. Uygulama bu miktarı sizin için hesaplamaz, önermez veya yaşınıza,
          kilonuza göre uyarlamaz.
        </p>
        <p>
          Etiket; ürünün kullanıcı grubunu ve günlük tüketilmesi gereken miktarı belirtir.
          Kaydı etiketle ve hekiminizin ya da eczacınızın planıyla karşılaştırmak sizin
          elinizdedir.
        </p>
        <p>
          Takviye edici gıdalar ilaç değildir; hastalık önleme veya tedavi amacıyla
          kullanılmaz. Bu uygulama tanı koymaz, tedavi önermez, ilaç etkileşimi
          değerlendirmez.
        </p>
      </section>

      <section className="info-section" aria-labelledby="info-sinir">
        <h2 id="info-sinir">2. Bilginin sınırı</h2>
        <p>
          Günlük enerji, uyku ve sindirim notları kendi bildirdiğiniz gözlemlerdir;
          ölçüm değildir. Grafikler yalnızca kaydettiğiniz günleri gösterir, eksik günler
          tahminle doldurulmaz.
        </p>
        <p>
          Hamilelik, emzirme, çocukluk çağı, kronik hastalık ve düzenli ilaç kullanımı
          gibi durumlarda ürünü kullanmadan önce hekiminize veya eczacınıza danışın.
          Buradaki metinler genel bilgilendirmedir; kişiye özel tıbbi tavsiye değildir.
        </p>
        <p>
          Yapay zekâ yanıtları da genel bilgi amaçlıdır. Yanıtlar hatalı veya eksik
          olabilir; kararlarınızı tek başına bu yanıtlara dayandırmayın.
        </p>
      </section>

      <section className="info-section" aria-labelledby="info-gizlilik">
        <h2 id="info-gizlilik">3. Gizlilik ve paylaşım</h2>
        <p>
          Profil, ürün ve kullanım kayıtlarınız, uygulamaya giriş yaptığınızda
          hesabınıza bağlı olarak güvenli bulut sunucularında (Supabase) saklanır.
          Hesabınızı silerseniz bu kayıtlar da silinir. Tam Aydınlatma Metni, kayıt
          sırasında size gösterilir.
        </p>
        <p>
          Sağlıkla ilgili bilgiler, KVKK kapsamında özel nitelikli kişisel veri olarak
          değerlendirilir. Yapay zekâ ile paylaşım isteğe bağlıdır: Profil ekranındaki
          izin kapalıyken profil bilgileri analiz için gönderilmez. İzni istediğiniz
          zaman kapatabilirsiniz.
        </p>
        <p>
          Sohbet mesajınız ve yazdığınız takviye adları, yanıt üretilebilmesi için
          yapay zekâ sağlayıcısına iletilir. Adınız ve e-posta adresiniz bu paylaşıma
          dahil edilmez.
        </p>
        <p>
          <Link className="info-inline-link" href="/profile">
            Profil ve paylaşım iznini yönet
          </Link>
        </p>
        <p className="info-note">
          Bu sayfa resmî bir KVKK aydınlatma metni değildir ve onun yerini almaz.
          Aydınlatma yükümlülüğü, açık rızadan ayrı bir yükümlülüktür. Ticari sürüm
          öncesinde veri sorumlusunun kimliği, iletişim bilgileri, işleme amaçları,
          aktarım ve saklama süreleri ile ilgili kişi hakları hukuk incelemesiyle
          eklenmelidir.
        </p>
      </section>

      <section className="info-section" aria-labelledby="info-kaynak">
        <h2 id="info-kaynak">Resmî kaynaklar</h2>
        <p>
          Aşağıdaki bağlantılar, bu sayfadaki ifadelerin dayandığı resmî kurum
          yayınlarıdır. Bağlantılar yeni sekmede açılır.
        </p>
        <ul className="info-sources">
          <li>
            <a
              href="https://guvenilirgida.tarimorman.gov.tr/Sayfa/Detay/1882"
              target="_blank"
              rel="noreferrer noopener"
            >
              Tarım ve Orman Bakanlığı — Takviye Edici Gıda
            </a>
            <span>
              “Takviye edici gıdalar ilaç değildir.” ve etiketteki kullanıcı grubu ile
              günlük miktara uyulması gerektiği belirtilir.
            </span>
          </li>
          <li>
            <a
              href="https://guvenilirgida.tarimorman.gov.tr/Haber/Detay/17132"
              target="_blank"
              rel="noreferrer noopener"
            >
              Tarım ve Orman Bakanlığı — Takviye Edici Gıdaların Bilinçli ve Güvenli
              Tüketimi
            </a>
            <span>
              Etiketteki kullanım talimatlarını ve uyarıları okumayı önerir; takviyelerin
              dengeli beslenmenin alternatifi olmadığını belirtir.
            </span>
          </li>
          <li>
            <a
              href="https://www.titck.gov.tr/SaglikBeyaniKullanimi"
              target="_blank"
              rel="noreferrer noopener"
            >
              TİTCK — Sağlık Beyanı Kullanımı Hakkında Sıkça Sorulan Sorular
            </a>
            <span>
              Sağlık beyanı kurallarını açıklar; sayfadaki bilgilerin yasal olarak
              bağlayıcılığı bulunmadığını belirtir.
            </span>
          </li>
          <li>
            <a
              href="https://www.kvkk.gov.tr/Icerik/8183/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber"
              target="_blank"
              rel="noreferrer noopener"
            >
              KVKK — Özel Nitelikli Kişisel Verilerin İşlenmesine İlişkin Rehber
            </a>
            <span>
              Sağlığa ilişkin verileri özel nitelikli kişisel veri olarak ele alır ve
              işleme şartlarını açıklar.
            </span>
          </li>
          <li>
            <a
              href="https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig"
              target="_blank"
              rel="noreferrer noopener"
            >
              KVKK — Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve
              Esaslar Hakkında Tebliğ
            </a>
            <span>
              Aydınlatmanın, açık rızaya veya diğer işleme şartlarına bağlı olmaksızın
              her işleme durumunda yerine getirilmesi gerektiğini belirtir.
            </span>
          </li>
        </ul>
      </section>

      <UsageDisclosure />

      <footer className="info-foot">
        <p>
          Bu metin hukuki danışmanlık veya uygunluk sertifikası değildir; ürün
          pazara çıkmadan önce hukuki ve klinik inceleme gerekir.
        </p>
        <p>
          <Link className="info-inline-link" href="/dashboard">
            Panoya dön
          </Link>
        </p>
      </footer>
    </main>
  )
}
