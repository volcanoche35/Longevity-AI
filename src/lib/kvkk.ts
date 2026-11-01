export interface KvkkSection {
  title: string
  body: string
}

/** Aydınlatma metni sürümü — rıza kaydı için. */
export const KVKK_CONSENT_VERSION = '1.0'

/** Onay kutusu kısa etiketi. */
export const KVKK_CONSENT_LABEL =
  '6698 sayılı KVKK kapsamında hazırlanan Aydınlatma Metni\'ni okudum; kişisel verilerimin ve özel nitelikli sağlık verilerimin belirtilen amaçlarla işlenmesine ve yurt dışına aktarılmasına açık rıza veriyorum.'

/**
 * Kişisel Verilerin Korunması ve İşlenmesi Hakkında Aydınlatma Metni.
 * KVKK m.10 + GDPR'ye uygun, Türkiye'de en yaygın kullanılan standart şablondur.
 */
export const KVKK_SECTIONS: KvkkSection[] = [
  {
    title: '1. Veri Sorumlusu',
    body:
      'İşbu Aydınlatma Metni kapsamında kişisel verileriniz, [Veri Sorumlusu Adı] ("LongevityAI" / "Veri Sorumlusu") tarafından, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuat uyarınca işlenmektedir.',
  },
  {
    title: '2. İşlenen Kişisel Veriler',
    body:
      'Aşağıdaki kişisel verileriniz işlenmektedir:\n' +
      '• Kimlik bilgileri: ad, e-posta adresi.\n' +
      '• Özel nitelikli kişisel veriler (sağlık verisi): yaş, cinsiyet, boy, kilo, sağlık hedefi, kullandığınız ilaçlar, bilinen hastalıklar/özel durumlar ve alerjiler.\n' +
      '• Takviye kullanım kayıtları: kullandığınız takviyeler, dozaj ve kullanım zamanları.\n' +
      '• Günlük özbildirim verileri: enerji, uyku ve sindirim durumunuza ilişkin beyanlarınız.',
  },
  {
    title: '3. Kişisel Verilerin İşlenme Amaçları',
    body:
      '• Uygulamanın temel işlevlerini yerine getirmek (takviye takibi, hatırlatma, kullanım geçmişi),\n' +
      '• Size özelleştirilmiş genel sağlık ve yaşam tarzı bilgileri sunmak,\n' +
      '• Yapay zekâ asistanı aracılığıyla genel bilgilendirme sağlamak,\n' +
      '• Uygulamanın geliştirilmesi ve iyileştirilmesi,\n' +
      '• Yasal yükümlülüklerin yerine getirilmesi.',
  },
  {
    title: '4. Hukuki Sebep',
    body:
      'Özel nitelikli sağlık verileriniz, KVKK m.6/2 uyarınca yalnızca AÇIK RIZANIZA dayalı olarak işlenmektedir. Diğer kişisel verileriniz ise KVKK m.5 kapsamında bir sözleşmenin kurulması/ifası ve meşru menfaat hukuki sebeplerine dayanılarak işlenebilir.',
  },
  {
    title: '5. Kişisel Verilerin Aktarılması (Yurt Dışı)',
    body:
      'Kişisel verileriniz, uygulamanın çalışması için gerekli olan aşağıdaki hizmet sağlayıcılara aktarılmaktadır:\n' +
      '• Supabase (veritabanı ve barındırma hizmeti),\n' +
      '• OpenRouter ve bağlı yapay zekâ modeli sağlayıcıları (yurt dışı — ABD).\n' +
      'Bu aktarımlar KVKK m.9 uyarınca açık rızanıza dayanmaktadır. Yurt dışına aktarım sırasında verileriniz yalnızca yukarıda belirtilen amaçlar doğrultusunda ve gerekli güvenlik tedbirleri alınarak işlenir. Yapay zekâ sağlayıcısına verilerinizin eğitim amacıyla kullanılmaması ve saklanmaması yönünde talimat verilmiştir.',
  },
  {
    title: '6. Toplama Yöntemi',
    body:
      'Kişisel verileriniz, uygulamayı kullanımınız sırasında (üyelik oluşturma, profil doldurma, takviye kaydı ve günlük girişi) elektronik ortamda, otomatik yollarla toplanır.',
  },
  {
    title: '7. Saklama Süresi',
    body:
      'Kişisel verileriniz, işleme amacının gerektirdiği süre ve yasal yükümlülükler boyunca saklanır. İşleme amacının ortadan kalkması veya tarafınızca silme talebinde bulunulması halinde verileriniz silinir, yok edilir veya anonim hale getirilir.',
  },
  {
    title: '8. KVKK m.11 Kapsamındaki Haklarınız',
    body:
      '• Kişisel verilerinizin işlenip işlenmediğini öğrenme,\n' +
      '• İşlenmişse buna ilişkin bilgi talep etme,\n' +
      '• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,\n' +
      '• Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme,\n' +
      '• Eksik veya yanlış işlenmişse düzeltilmesini isteme,\n' +
      '• Silinmesini veya yok edilmesini isteme,\n' +
      '• İşleme itiraz etme,\n' +
      '• İşleme nedeniyle uğradığınız zararın giderilmesini talep etme.',
  },
  {
    title: '9. Başvuru',
    body:
      'KVKK m.11 kapsamındaki haklarınıza ilişkin taleplerinizi, Veri Sorumlusu\'na [iletişim e-posta adresi] üzerinden yazılı olarak iletebilirsiniz. Başvurularınız, talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır.',
  },
]
