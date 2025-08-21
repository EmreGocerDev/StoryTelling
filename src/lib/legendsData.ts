export interface Legend {
  name: string;
  description: string;
}

export interface LegendCategory {
  categoryName: string;
  legends: Legend[];
}

export const legendsData: LegendCategory[] = [
  {
    categoryName: "Mitolojik Efsaneler",
    legends: [
      { name: "Herkül'ün 12 Görevi", description: "Yarı tanrı Herkül'ün imkansız görünen görevlerini tamamla." },
      { name: "Truva Savaşı", description: "Aşil ve Hektor gibi kahramanların olduğu efsanevi savaşa katıl." },
      { name: "Gılgamış Destanı", description: "Ölümsüzlüğü arayan Sümer kralı Gılgamış'ın maceralarını yaşa." },
      { name: "Ragnarok", description: "İskandinav tanrılarının kıyamet savaşında Odin ve Thor ile omuz omuza savaş." },
      { name: "Theseus ve Minotaur", description: "Girit'in labirentinde korkunç Minotaur'u bul ve alt et." },
      { name: "İason ve Altın Post", description: "Argo gemisiyle tehlikeli denizleri aş ve Altın Post'u ele geçir." },
      { name: "Osiris Miti", description: "Kardeşi Set tarafından öldürülen Mısır tanrısı Osiris'in yeniden doğuşuna tanıklık et." },
      { name: "Amaterasu'nun Mağarası", description: "Japon güneş tanrıçası Amaterasu'yu saklandığı mağaradan çıkarmaya yardım et." },
      { name: "Persephone'nin Kaçırılışı", description: "Yeraltı dünyasının tanrısı Hades tarafından kaçırılan tanrıçanın hikayesi." },
      { name: "Prometheus'un Ateşi", description: "İnsanlığa ateşi hediye ederek tanrıları karşısına alan titan ol." },
    ],
  },
  {
    categoryName: "Korku ve Gerilim",
    legends: [
      { name: "Drakula", description: "Transilvanya'nın karanlık şatosunda Kont Drakula'nın gizemini çöz." },
      { name: "Cthulhu'nun Çağrısı", description: "H.P. Lovecraft'ın kozmik korku dünyasında aklını kaybetmeden hayatta kal." },
      { name: "Slender Man", description: "Ormanda gizlenen bu modern efsaneden kanıt topla ve kaç." },
      { name: "13. Cuma", description: "Crystal Lake kampında maskeli katil Jason Voorhees'ten kurtul." },
      { name: "Frankenstein", description: "Victor Frankenstein'ın yarattığı trajik canavarın hikayesini deneyimle." },
      { name: "Wendigo", description: "Kuzey Amerika ormanlarında, insan yiyen bu korkunç yaratıktan saklan." },
      { name: "Gulyabani", description: "Osmanlı'nın karanlık konaklarında ve çöllerinde gezinen bu hortlakla yüzleş." },
      { name: "La Llorona", description: "Nehir kenarında ağlayan bu hüzünlü hayaletin lanetinden kaç." },
    ],
  },
  {
    categoryName: "Türk ve Anadolu Efsaneleri",
    legends: [
      { name: "Ergenekon Destanı", description: "Demir dağı eriterek atalarına yeniden yol açan Göktürklerin lideri ol." },
      { name: "Şahmaran Efsanesi", description: "Yılanların kraliçesi Şahmaran'ın sırrını keşfet ve onu koru." },
      { name: "Ağrı Dağı Efsanesi", description: "Gülbahar ve çoban Ahmet'in trajik aşk hikayesinde kaderi değiştirmeye çalış." },
      { name: "Kız Kulesi Efsanesi", description: "Yılan kehanetinden kaçmak için kuleye kapatılan prensesin hikayesini yaşa." },
      { name: "Nasreddin Hoca", description: "Anadolu'nun bilge ve komik kahramanıyla fıkraları yaşa ve dersler çıkar." },
      { name: "Köroğlu Destanı", description: "Babasının intikamı için dağlara çıkan Ruşen Ali'nin adalet mücadelesine katıl." },
      { name: "Alkarısı", description: "Lohusa kadınların kabusu olan bu mitolojik varlıkla mücadele et." },
      { name: "Tepegöz", description: "Dede Korkut hikayelerindeki tek gözlü devi alt eden Basat'ın yanında ol." },
    ],
  },
  {
    categoryName: "Bilim Kurgu ve Fantezi",
    legends: [
      { name: "Atlantis'in Kayboluşu", description: "Sulara gömülmeden önce efsanevi kıta Atlantis'in sırlarını ve teknolojisini keşfet." },
      { name: "Dune: Çöl Gezegeni", description: "Arrakis'in kontrolü için verilen politik ve mistik savaşta Paul Atreides'e katıl." },
      { name: "Yüzüklerin Efendisi", description: "Orta Dünya'yı Sauron'un karanlığından kurtarmak için Tek Yüzük'ü yok et." },
      { name: "Asimov'un Vakıf'ı", description: "Galaktik bir imparatorluğun çöküşünü öngören Hari Seldon'ın planını devam ettir." },
      { name: "Cyberpunk 2077'nin Gecesi", description: "Night City'nin neon ışıklı sokaklarında hayatta kalmaya çalışan bir paralı asker ol." },
      { name: "Stalker: Yasak Bölge", description: "Çernobil'in 'Bölge'sindeki anormallikleri ve gizemli eserleri araştır." },
    ],
  },
  {
    categoryName: "Tarihi ve Folklorik",
    legends: [
      { name: "Kral Arthur ve Yuvarlak Masa", description: "Camelot'un efsanevi kralı ol, Excalibur'u bul ve krallığını birleştir." },
      { name: "Robin Hood", description: "Sherwood Ormanı'nda zenginden alıp fakire veren kanun kaçağı ol." },
      { name: "El Dorado'nun Peşinde", description: "Amazon ormanlarının derinliklerindeki kayıp altın şehri ara." },
      { name: "Kleopatra'nın Son Günleri", description: "Mısır'ın son kraliçesi olarak Roma'ya karşı politik bir savaş ver." },
      { name: "Jeanne d'Arc'ın Yükselişi", description: "Fransa'yı kurtarmak için ilahi sesler duyan genç bir köylü kızına liderlik et." },
      { name: "Karayip Korsanları", description: "Efsanevi Kaptan Karasakal veya Calico Jack ile denizlerde maceralara atıl." },
      { name: "Samurayın Yolu", description: "Feodal Japonya'da onurunu korumaya çalışan bir samuray veya ronin ol." },
    ],
  },
];