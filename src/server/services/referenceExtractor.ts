import { ReferencedItem, ReferenceCategory } from '../../shared/types';

// Normalized dictionary of Quran surahs (Name -> Number, French/Transliteration variants)
const SURAHS: { name: string; number: number; aliases: string[] }[] = [
  { name: 'Al-Fatiha', number: 1, aliases: ['fatiha', 'prologue', 'al fatiha'] },
  { name: 'Al-Baqara', number: 2, aliases: ['baqara', 'baqarah', 'la vache', 'al baqara'] },
  { name: 'Ali Imran', number: 3, aliases: ['ali imran', 'al imran', 'famille d\'imran', 'al-imran'] },
  { name: 'An-Nisa', number: 4, aliases: ['an nisa', 'nisa', 'les femmes', 'an-nisa\''] },
  { name: 'Al-Ma\'idah', number: 5, aliases: ['al maidah', 'maidah', 'la table servie', 'al-maida'] },
  { name: 'Al-An\'am', number: 6, aliases: ['al anam', 'anam', 'les bestiaux', 'al-an\'am'] },
  { name: 'Al-A\'raf', number: 7, aliases: ['al araf', 'araf', 'les murailles'] },
  { name: 'Al-Anfal', number: 8, aliases: ['al anfal', 'anfal', 'le butin'] },
  { name: 'At-Tawbah', number: 9, aliases: ['at tawbah', 'tawbah', 'le repentir', 'at-tawba'] },
  { name: 'Yunus', number: 10, aliases: ['yunus', 'jonas'] },
  { name: 'Hud', number: 11, aliases: ['hud'] },
  { name: 'Yusuf', number: 12, aliases: ['yusuf', 'joseph'] },
  { name: 'Ar-Ra\'d', number: 13, aliases: ['ar rad', 'rad', 'le tonnerre'] },
  { name: 'Ibrahim', number: 14, aliases: ['ibrahim', 'abraham'] },
  { name: 'Al-Hijr', number: 15, aliases: ['al hijr', 'hijr'] },
  { name: 'An-Nahl', number: 16, aliases: ['an nahl', 'nahl', 'les abeilles'] },
  { name: 'Al-Isra', number: 17, aliases: ['al isra', 'isra', 'le voyage nocturne'] },
  { name: 'Al-Kahf', number: 18, aliases: ['al kahf', 'kahf', 'la caverne'] },
  { name: 'Maryam', number: 19, aliases: ['maryam', 'marie'] },
  { name: 'Ta-Ha', number: 20, aliases: ['taha', 'ta-ha'] },
  { name: 'Al-Anbiya', number: 21, aliases: ['al anbiya', 'anbiya', 'les prophetes', 'les prophètes'] },
  { name: 'Al-Hajj', number: 22, aliases: ['al hajj', 'hajj', 'le pelerinage', 'le pèlerinage'] },
  { name: 'Al-Mu\'minun', number: 23, aliases: ['al muminun', 'muminun', 'les croyants'] },
  { name: 'An-Nur', number: 24, aliases: ['an nur', 'nur', 'la lumiere', 'la lumière', 'an-nour'] },
  { name: 'Al-Furqan', number: 25, aliases: ['al furqan', 'furqan', 'le discernement'] },
  { name: 'Ash-Shu\'ara', number: 26, aliases: ['ash shuara', 'les poetes', 'les poètes'] },
  { name: 'An-Naml', number: 27, aliases: ['an naml', 'naml', 'les fourmis'] },
  { name: 'Al-Qasas', number: 28, aliases: ['al qasas', 'qasas', 'le recit', 'le récit'] },
  { name: 'Al-Ankabut', number: 29, aliases: ['al ankabut', 'ankabut', 'l\'araignee', 'l\'araignée'] },
  { name: 'Ar-Rum', number: 30, aliases: ['ar rum', 'rum', 'les romains'] },
  { name: 'Luqman', number: 31, aliases: ['luqman', 'lokman'] },
  { name: 'As-Sajda', number: 32, aliases: ['as sajda', 'sajda', 'la prosternation'] },
  { name: 'Al-Ahzab', number: 33, aliases: ['al ahzab', 'ahzab', 'les coalises', 'les coalisés'] },
  { name: 'Saba', number: 34, aliases: ['saba'] },
  { name: 'Fatir', number: 35, aliases: ['fatir', 'le createur', 'le créateur'] },
  { name: 'Ya-Sin', number: 36, aliases: ['yasin', 'ya-sin', 'ya sin'] },
  { name: 'As-Saffat', number: 37, aliases: ['as saffat', 'les ranges', 'les rangés'] },
  { name: 'Sad', number: 38, aliases: ['sad'] },
  { name: 'Az-Zumar', number: 39, aliases: ['az zumar', 'zumar', 'les groupes'] },
  { name: 'Ghafir', number: 40, aliases: ['ghafir', 'le pardonneur'] },
  { name: 'Fussilat', number: 41, aliases: ['fussilat', 'les versets detailles', 'les versets détaillés'] },
  { name: 'Ash-Shura', number: 42, aliases: ['ash shura', 'shura', 'la consultation'] },
  { name: 'Az-Zukhruf', number: 43, aliases: ['az zukhruf', 'zukhruf', 'l\'ornement'] },
  { name: 'Ad-Dukhan', number: 44, aliases: ['ad dukhan', 'dukhan', 'la fumee', 'la fumée'] },
  { name: 'Al-Jathiya', number: 45, aliases: ['al jathiya', 'l\'agenouillee', 'l\'agenouillée'] },
  { name: 'Al-Ahqaf', number: 46, aliases: ['al ahqaf', 'ahqaf'] },
  { name: 'Muhammad', number: 47, aliases: ['muhammad', 'mahomet'] },
  { name: 'Al-Fath', number: 48, aliases: ['al fath', 'fath', 'la victoire éclatante', 'la victoire'] },
  { name: 'Al-Hujurat', number: 49, aliases: ['al hujurat', 'hujurat', 'les appartements'] },
  { name: 'Qaf', number: 50, aliases: ['qaf'] },
  { name: 'Adh-Dhariyat', number: 51, aliases: ['adh dhariyat', 'qui eparpillent'] },
  { name: 'At-Tur', number: 52, aliases: ['at tur', 'tur', 'le mont'] },
  { name: 'An-Najm', number: 53, aliases: ['an najm', 'najm', 'l\'etoile', 'l\'étoile'] },
  { name: 'Al-Qamar', number: 54, aliases: ['al qamar', 'qamar', 'la lune'] },
  { name: 'Ar-Rahman', number: 55, aliases: ['ar rahman', 'rahman', 'le tout misericordieux', 'le tout miséricordieux'] },
  { name: 'Al-Waqi\'a', number: 56, aliases: ['al waqia', 'waqia', 'l\'evenement', 'l\'événement'] },
  { name: 'Al-Hadid', number: 57, aliases: ['al hadid', 'hadid', 'le fer'] },
  { name: 'Al-Mujadila', number: 58, aliases: ['al mujadila', 'la discussion'] },
  { name: 'Al-Hashr', number: 59, aliases: ['al hashr', 'hashr', 'l\'exode'] },
  { name: 'Al-Mumtahana', number: 60, aliases: ['al mumtahana', 'l\'eprouvee'] },
  { name: 'As-Saff', number: 61, aliases: ['as saff', 'saff', 'le rang'] },
  { name: 'Al-Jumu\'a', number: 62, aliases: ['al jumua', 'jumua', 'le vendredi'] },
  { name: 'Al-Munafiqun', number: 63, aliases: ['al munafiqun', 'les hypocrites'] },
  { name: 'At-Taghabun', number: 64, aliases: ['at taghabun', 'la grande perte'] },
  { name: 'At-Talaq', number: 65, aliases: ['at talaq', 'talaq', 'le divorce'] },
  { name: 'At-Tahrim', number: 66, aliases: ['at tahrim', 'tahrim', 'l\'interdiction'] },
  { name: 'Al-Mulk', number: 67, aliases: ['al mulk', 'mulk', 'la royaute', 'la royauté'] },
  { name: 'Al-Qalam', number: 68, aliases: ['al qalam', 'qalam', 'la plume'] },
  { name: 'Al-Haqqa', number: 69, aliases: ['al haqqa', 'l\'inevitable'] },
  { name: 'Al-Ma\'arij', number: 70, aliases: ['al maarij', 'les voies d\'ascension'] },
  { name: 'Nuh', number: 71, aliases: ['nuh', 'noe', 'noé'] },
  { name: 'Al-Jinn', number: 72, aliases: ['al jinn', 'jinn', 'les djinns'] },
  { name: 'Al-Muzzammil', number: 73, aliases: ['al muzzammil', 'l\'enveloppe'] },
  { name: 'Al-Muddaththir', number: 74, aliases: ['al muddaththir', 'le revetu d\'un manteau'] },
  { name: 'Al-Qiyama', number: 75, aliases: ['al qiyama', 'qiyama', 'la resurrection', 'la résurrection'] },
  { name: 'Al-Insan', number: 76, aliases: ['al insan', 'l\'homme', 'ad-dahr'] },
  { name: 'Al-Mursalat', number: 77, aliases: ['al mursalat', 'les envoyes'] },
  { name: 'An-Naba', number: 78, aliases: ['an naba', 'naba', 'la nouvelle'] },
  { name: 'An-Nazi\'at', number: 79, aliases: ['an naziat', 'les anges qui arrachent'] },
  { name: '\'Abasa', number: 80, aliases: ['abasa', 'il s\'est renfrogne'] },
  { name: 'At-Takwir', number: 81, aliases: ['at takwir', 'l\'obscurcissement'] },
  { name: 'Al-Infitar', number: 82, aliases: ['al infitar', 'la rupture'] },
  { name: 'Al-Mutaffifin', number: 83, aliases: ['al mutaffifin', 'les fraudeurs'] },
  { name: 'Al-Inshiqaq', number: 84, aliases: ['al inshiqaq', 'la dechirure'] },
  { name: 'Al-Buruj', number: 85, aliases: ['al buruj', 'les constellations'] },
  { name: 'At-Tariq', number: 86, aliases: ['at tariq', 'l\'astre nocturne'] },
  { name: 'Al-A\'la', number: 87, aliases: ['al ala', 'le tres haut', 'le très-haut'] },
  { name: 'Al-Ghashiya', number: 88, aliases: ['al ghashiya', 'l\'enveloppante'] },
  { name: 'Al-Fajr', number: 89, aliases: ['al fajr', 'fajr', 'l\'aube'] },
  { name: 'Al-Balad', number: 90, aliases: ['al balad', 'la cite', 'la cité'] },
  { name: 'Ash-Shams', number: 91, aliases: ['ash shams', 'le soleil'] },
  { name: 'Al-Layl', number: 92, aliases: ['al layl', 'la nuit'] },
  { name: 'Ad-Duha', number: 93, aliases: ['ad duha', 'le jour montant'] },
  { name: 'Ash-Sharh', number: 94, aliases: ['ash sharh', 'l\'ouverture', 'al inshirah'] },
  { name: 'At-Tin', number: 95, aliases: ['at tin', 'le figuier'] },
  { name: 'Al-\'Alaq', number: 96, aliases: ['al alaq', 'l\'adherence', 'l\'adhérence'] },
  { name: 'Al-Qadr', number: 97, aliases: ['al qadr', 'qadr', 'la destinee', 'la destinée', 'la nuit du destin'] },
  { name: 'Al-Bayyina', number: 98, aliases: ['al bayyina', 'la preuve'] },
  { name: 'Az-Zalzala', number: 99, aliases: ['az zalzala', 'la secousse'] },
  { name: 'Al-\'Adiyat', number: 100, aliases: ['al adiyat', 'les coursiers'] },
  { name: 'Al-Qari\'a', number: 101, aliases: ['al qaria', 'le fracas'] },
  { name: 'At-Takathur', number: 102, aliases: ['at takathur', 'la course aux richesses'] },
  { name: 'Al-\'Asr', number: 103, aliases: ['al asr', 'le temps', 'l\'epoque'] },
  { name: 'Al-Humaza', number: 104, aliases: ['al humaza', 'les calomniateurs'] },
  { name: 'Al-Fil', number: 105, aliases: ['al fil', 'l\'elephant', 'l\'éléphant'] },
  { name: 'Quraysh', number: 106, aliases: ['quraysh', 'les coraichites', 'quraych'] },
  { name: 'Al-Ma\'un', number: 107, aliases: ['al maun', 'l\'ustensile'] },
  { name: 'Al-Kawthar', number: 108, aliases: ['al kawthar', 'l\'abondance'] },
  { name: 'Al-Kafirun', number: 109, aliases: ['al kafirun', 'les infideles', 'les infidèles'] },
  { name: 'An-Nasr', number: 110, aliases: ['an nasr', 'les secours'] },
  { name: 'Al-Masad', number: 111, aliases: ['al masad', 'les fibres', 'al lahab'] },
  { name: 'Al-Ikhlas', number: 112, aliases: ['al ikhlas', 'le monotheisme pur', 'le monothéisme pur'] },
  { name: 'Al-Falaq', number: 113, aliases: ['al falaq', 'l\'aube naissante'] },
  { name: 'An-Nas', number: 114, aliases: ['an nas', 'les hommes'] },
];

function findSurahByNameOrNumber(input: string | number): { name: string; number: number } | null {
  if (typeof input === 'number' || /^\d+$/.test(String(input).trim())) {
    const num = parseInt(String(input).trim(), 10);
    const s = SURAHS.find(item => item.number === num);
    return s ? { name: s.name, number: s.number } : (num >= 1 && num <= 114 ? { name: `Sourate ${num}`, number: num } : null);
  }
  const clean = String(input).toLowerCase().replace(/^(sourate|surah|surat)\s+/i, '').trim();
  const found = SURAHS.find(s => {
    const sName = s.name.toLowerCase();
    if (clean === sName || clean.replace(/[^a-z0-9]/g, '') === sName.replace(/[^a-z0-9]/g, '')) return true;
    return s.aliases.some(a => clean === a || clean.replace(/[^a-z0-9]/g, '') === a.replace(/[^a-z0-9]/g, ''));
  });
  return found ? { name: found.name, number: found.number } : null;
}

// Canonical Hadith Compilations
const HADITH_COLLECTIONS: { name: string; aliases: string[] }[] = [
  { name: 'Sahih Al-Bukhari', aliases: ['al-boukhari', 'al boukhari', 'boukhari', 'bukhari', 'sahih al-bukhari', 'sahih bukhari'] },
  { name: 'Sahih Muslim', aliases: ['muslim', 'mouslim', 'sahih muslim', 'sahih mouslim'] },
  { name: 'Sunan Abi Dawud', aliases: ['abu daoud', 'abou daoud', 'abu dawud', 'abi dawud', 'sunan abi dawud'] },
  { name: 'Jami\' at-Tirmidhi', aliases: ['at-tirmidhi', 'at tirmidhi', 'tirmidhi', 'tirmizi'] },
  { name: 'Sunan an-Nasa\'i', aliases: ['an-nasa\'i', 'an nasai', 'nasai', 'an-nasai'] },
  { name: 'Sunan Ibn Majah', aliases: ['ibn majah', 'ibn maja', 'ibn madja'] },
  { name: 'Muwatta Malik', aliases: ['muwatta', 'muwatta de l\'imam malik', 'muwatta malik'] },
  { name: 'Musnad Ahmad', aliases: ['musnad ahmad', 'musnad de l\'imam ahmad', 'imam ahmad'] },
  { name: 'Riyad as-Salihin', aliases: ['riyad as-salihin', 'riyad salihin', 'jardins des vertueux'] },
  { name: '40 Hadiths Nawawi', aliases: ['40 hadiths', 'quarante hadiths', 'arba\'in an-nawawiyya', '40 hadiths de nawawi'] },
  { name: 'Sahih Ibn Hibban', aliases: ['ibn hibban'] },
  { name: 'Mustadrak Al-Hakim', aliases: ['al-hakim', 'mustadrak'] }
];

// Major Islamic Personalities (Prophets, Sahaba, Scholars, Figures)
const PEOPLE: { name: string; role: 'Prophet' | 'Sahaba' | 'Scholar' | 'Figure'; regex: RegExp; aliases: string[] }[] = [
  // Prophets
  { name: 'Adam', role: 'Prophet', regex: /\b(adam|âdam)\b/i, aliases: ['adam'] },
  { name: 'Ibrahim (Abraham)', role: 'Prophet', regex: /\b(ibrahim|abraham)\b/i, aliases: ['ibrahim', 'abraham'] },
  { name: 'Moussa (Moïse)', role: 'Prophet', regex: /\b(moussa|mousa|moïse|moise)\b/i, aliases: ['moussa', 'moise'] },
  { name: 'Issa (Jésus)', role: 'Prophet', regex: /\b(issa|\'issa|jésus|jesus)\b/i, aliases: ['issa', 'jesus'] },
  { name: 'Muhammad ﷺ', role: 'Prophet', regex: /\b(muhammad|mohammed|mahomet|le prophète|l'envoyé d'allah)\b/i, aliases: ['muhammad', 'prophete'] },
  { name: 'Nouh (Noé)', role: 'Prophet', regex: /\b(nouh|nuh|noé|noe)\b/i, aliases: ['nouh', 'noe'] },
  { name: 'Yusuf (Joseph)', role: 'Prophet', regex: /\b(yusuf|youssef|joseph)\b/i, aliases: ['yusuf', 'joseph'] },
  { name: 'Younous (Jonas)', role: 'Prophet', regex: /\b(younous|yunus|jonas)\b/i, aliases: ['younous', 'jonas'] },
  { name: 'Daoud (David)', role: 'Prophet', regex: /\b(daoud|david)\b/i, aliases: ['daoud', 'david'] },
  { name: 'Soulayman (Salomon)', role: 'Prophet', regex: /\b(soulayman|sulayman|salomon)\b/i, aliases: ['soulayman', 'salomon'] },
  { name: 'Ismaël (Ismail)', role: 'Prophet', regex: /\b(ismail|ismaël|ismael)\b/i, aliases: ['ismail', 'ismael'] },
  { name: 'Ishaq (Isaac)', role: 'Prophet', regex: /\b(ishaq|isaac)\b/i, aliases: ['ishaq', 'isaac'] },
  { name: 'Ya\'qub (Jacob)', role: 'Prophet', regex: /\b(ya\'qub|yaqub|jacob)\b/i, aliases: ['yaqub', 'jacob'] },
  { name: 'Ayyub (Job)', role: 'Prophet', regex: /\b(ayyub|job)\b/i, aliases: ['ayyub', 'job'] },

  // Sahaba (Companions)
  { name: 'Abou Bakr As-Siddiq', role: 'Sahaba', regex: /\b(abou\s+bakr|abu\s+bakr|as-siddiq)\b/i, aliases: ['abou bakr', 'abu bakr'] },
  { name: 'Omar ibn Al-Khattab', role: 'Sahaba', regex: /\b(omar\s+ibn\s+al-khattab|umar\s+ibn\s+al-khattab|omar|umar)\b/i, aliases: ['omar', 'umar'] },
  { name: 'Othman ibn Affan', role: 'Sahaba', regex: /\b(othman\s+ibn\s+affan|uthman\s+ibn\s+affan|othman|uthman)\b/i, aliases: ['othman', 'uthman'] },
  { name: 'Ali ibn Abi Talib', role: 'Sahaba', regex: /\b(ali\s+ibn\s+abi\s+talib|\bali\b)\b/i, aliases: ['ali', 'ali ibn abi talib'] },
  { name: 'Aisha bint Abi Bakr', role: 'Sahaba', regex: /\b(aisha|aïcha|\'aisha)\b/i, aliases: ['aisha', 'aicha'] },
  { name: 'Khadija bint Khuwaylid', role: 'Sahaba', regex: /\b(khadija|khadidja)\b/i, aliases: ['khadija'] },
  { name: 'Fatima Az-Zahra', role: 'Sahaba', regex: /\b(fatima|fatimah|az-zahra)\b/i, aliases: ['fatima'] },
  { name: 'Abou Hourayra', role: 'Sahaba', regex: /\b(abou\s+hourayra|abu\s+huraira|abu\s+hurayrah|abou\s+houreyra)\b/i, aliases: ['abou hourayra', 'abu huraira'] },
  { name: 'Abdallah ibn Abbas', role: 'Sahaba', regex: /\b(ibn\s+abbas|abdallah\s+ibn\s+abbas)\b/i, aliases: ['ibn abbas'] },
  { name: 'Abdallah ibn Mas\'ud', role: 'Sahaba', regex: /\b(ibn\s+mas\'ud|ibn\s+masud|abdallah\s+ibn\s+mas\'ud)\b/i, aliases: ['ibn masud'] },
  { name: 'Abdallah ibn Omar', role: 'Sahaba', regex: /\b(ibn\s+omar|ibn\s+umar|abdallah\s+ibn\s+omar)\b/i, aliases: ['ibn omar'] },
  { name: 'Anas ibn Malik', role: 'Sahaba', regex: /\b(anas\s+ibn\s+malik|anas)\b/i, aliases: ['anas ibn malik'] },
  { name: 'Bilal ibn Rabah', role: 'Sahaba', regex: /\b(bilal\s+ibn\s+rabah|bilal)\b/i, aliases: ['bilal'] },
  { name: 'Khalid ibn Al-Walid', role: 'Sahaba', regex: /\b(khalid\s+ibn\s+al-walid|khalid)\b/i, aliases: ['khalid ibn al-walid'] },
  { name: 'Salman Al-Farsi', role: 'Sahaba', regex: /\b(salman\s+al-farsi|salman)\b/i, aliases: ['salman al-farsi'] },
  { name: 'Abu Dharr Al-Ghifari', role: 'Sahaba', regex: /\b(abu\s+dharr|abou\s+dharr)\b/i, aliases: ['abu dharr'] },

  // Scholars & Imams
  { name: 'Imam Malik ibn Anas', role: 'Scholar', regex: /\b(imam\s+malik|m[aâ]lik\s+ibn\s+anas|malikite|mâlikite)\b/i, aliases: ['imam malik', 'malik'] },
  { name: 'Imam Abou Hanifa', role: 'Scholar', regex: /\b(abou\s+hanifa|abu\s+hanifa|hanafite)\b/i, aliases: ['abou hanifa'] },
  { name: 'Imam Ash-Shafi\'i', role: 'Scholar', regex: /\b(al-chafi\'i|ash-shafi\'i|chafiite|châfi\'ite)\b/i, aliases: ['ash-shafii', 'al-chafii'] },
  { name: 'Imam Ahmad ibn Hanbal', role: 'Scholar', regex: /\b(ahmad\s+ibn\s+hanbal|hanbalite)\b/i, aliases: ['ahmad ibn hanbal'] },
  { name: 'Imam Al-Bukhari', role: 'Scholar', regex: /\b(imam\s+al-boukhari|imam\s+al-bukhari)\b/i, aliases: ['al-bukhari'] },
  { name: 'Imam Muslim', role: 'Scholar', regex: /\b(imam\s+muslim|imam\s+mouslim)\b/i, aliases: ['muslim'] },
  { name: 'Imam An-Nawawi', role: 'Scholar', regex: /\b(an-nawawi|nawawi|imam\s+an-nawawi)\b/i, aliases: ['an-nawawi', 'nawawi'] },
  { name: 'Ibn Taymiyya', role: 'Scholar', regex: /\b(ibn\s+taymiyya|ibn\s+taymiyyah)\b/i, aliases: ['ibn taymiyya'] },
  { name: 'Ibn al-Qayyim', role: 'Scholar', regex: /\b(ibn\s+al-qayyim|ibn\s+qayyim)\b/i, aliases: ['ibn al-qayyim'] },
  { name: 'Imam Al-Ghazali', role: 'Scholar', regex: /\b(al-ghazali|ghazali|imam\s+al-ghazali)\b/i, aliases: ['al-ghazali'] },
  { name: 'Ibn Kathir', role: 'Scholar', regex: /\b(ibn\s+kathir|ibn\s+kethir)\b/i, aliases: ['ibn kathir'] },
  { name: 'Al-Qurtubi', role: 'Scholar', regex: /\b(al-qurtubi|qurtubi)\b/i, aliases: ['al-qurtubi'] },
  { name: 'Ibn \'Ashir', role: 'Scholar', regex: /\b(ibn\s+['\u2019]ashir|ibn\s+['\u2019]âchir)\b/i, aliases: ['ibn ashir'] },
  { name: 'Ibn Hajar al-Asqalani', role: 'Scholar', regex: /\b(ibn\s+hajar|al-asqalani)\b/i, aliases: ['ibn hajar'] },
  { name: 'Cheikh Al-Albani', role: 'Scholar', regex: /\b(al-albani|cheikh\s+al-albani)\b/i, aliases: ['al-albani'] },
  { name: 'Cheikh Ibn Baz', role: 'Scholar', regex: /\b(ibn\s+baz|cheikh\s+ibn\s+baz)\b/i, aliases: ['ibn baz'] },
  { name: 'Cheikh Ibn \'Uthaymeen', role: 'Scholar', regex: /\b(ibn\s+['\u2019]uthaymeen|ibn\s+othaimine)\b/i, aliases: ['ibn uthaymeen'] },

  // Figures
  { name: 'Hawa (Ève)', role: 'Figure', regex: /\b(hawa|eve|ève)\b/i, aliases: ['hawa', 'eve'] },
  { name: 'Maryam (Marie)', role: 'Figure', regex: /\b(maryam|marie)\b/i, aliases: ['maryam', 'marie'] },
  { name: 'Iblis (Satan)', role: 'Figure', regex: /\b(iblis|chaytan|shaytan|satan)\b/i, aliases: ['iblis', 'satan'] },
  { name: 'Pharaon (Fir\'awn)', role: 'Figure', regex: /\b(pharaon|fir\'awn|firawn)\b/i, aliases: ['pharaon', 'firawn'] }
];

// Major Islamic Events
const EVENTS: { name: string; regex: RegExp; period?: string; aliases: string[] }[] = [
  { name: 'L\'Hégire (Hijra)', regex: /\b(h[ée]gire|hijra|l'h[ée]gire)\b/i, period: 'Prophetic', aliases: ['hegire', 'hijra'] },
  { name: 'Bataille de Badr', regex: /\b(bataille\s+de\s+badr|badr)\b/i, period: 'Medinan', aliases: ['badr', 'bataille de badr'] },
  { name: 'Bataille d\'Uhud', regex: /\b(bataille\s+d['\u2019]uhud|uhud)\b/i, period: 'Medinan', aliases: ['uhud', 'bataille d\'uhud'] },
  { name: 'Bataille du Fossé (Khandaq)', regex: /\b(bataille\s+du\s+foss[ée]|khandaq|foss[ée])\b/i, period: 'Medinan', aliases: ['khandaq', 'bataille du fosse'] },
  { name: 'Le Pacte d\'Al-Hudaybiyya', regex: /\b(trait[ée]\s+d['\u2019]al-houdaybiya|pacte\s+d['\u2019]al-hudaybiyya|hudaybiyya|houdaybiya)\b/i, period: 'Medinan', aliases: ['hudaybiyya', 'houdaybiya'] },
  { name: 'La Conquête de la Mecque (Fath Makka)', regex: /\b(conqu[êe]te\s+de\s+la\s+mecque|fath\s+makka)\b/i, period: 'Medinan', aliases: ['fath makka', 'conquete de la mecque'] },
  { name: 'Le Pèlerinage d\'adieu (Hajjat al-Wada\')', regex: /\b(p[èe]lerinage\s+d['\u2019]adieu|hajjat\s+al-wada['\u2019]?)\b/i, period: 'Medinan', aliases: ['hajjat al-wada', 'pelerinage d\'adieu'] },
  { name: 'Le Voyage Nocturne et l\'Ascension (Al-Isra wal-Mi\'raj)', regex: /\b(voyage\s+nocturne|isra\s+et\s+mi['\u2019]?raj|al-isra\s+wal-mi['\u2019]?raj)\b/i, period: 'Meccan', aliases: ['isra wal miraj', 'voyage nocturne'] },
  { name: 'La Révélation dans la grotte de Hira', regex: /\b(grotte\s+de\s+hira|d[ée]but\s+de\s+la\s+r[ée]v[ée]lation)\b/i, period: 'Meccan', aliases: ['grotte de hira', 'revelation'] },
  { name: 'La Création d\'Adam', regex: /\b(cr[ée]ation\s+d['\u2019]adam)\b/i, period: 'Creation', aliases: ['creation d\'adam'] },
  { name: 'La Chute / L\'Expulsion du Paradis', regex: /\b(chute\s+d['\u2019]adam|expulsion\s+du\s+paradis)\b/i, period: 'Creation', aliases: ['expulsion du paradis', 'chute d\'adam'] },
  { name: 'Le Déluge de Noé', regex: /\b(d[ée]luge\s+de\s+no[ée]|d[ée]luge)\b/i, period: 'Prophets', aliases: ['deluge de noe'] },
  { name: 'Le Sacrifice d\'Ismaël', regex: /\b(sacrifice\s+d['\u2019]isma[eë]l|sacrifice\s+d['\u2019]abraham)\b/i, period: 'Prophets', aliases: ['sacrifice d\'ismail'] },
  { name: 'Le Jour du Jugement (Yawm al-Qiyamah)', regex: /\b(jour\s+du\s+jugement|yawm\s+al-qiyama|jour\s+dernier|la\s+r[ée]surrection)\b/i, period: 'Eschatology', aliases: ['jour du jugement', 'yawm al-qiyama'] }
];

/**
 * Extrait automatiquement toutes les références canoniques d'un texte
 * (Coran, Hadith, Personnalités, Événements).
 */
export function extractReferencedItems(
  text: string,
  sourceRole: 'user' | 'assistant' | 'model',
  messageIndex?: number,
  externalSources?: any[]
): ReferencedItem[] {
  if (!text || typeof text !== 'string') return [];

  const foundItems = new Map<string, ReferencedItem>();
  const normalizedText = text.replace(/[\r\n]+/g, ' ');

  // 1. EXTRACT QURAN REFERENCES
  // Pattern 1: Ayat al-Kursi / Verset du Trône
  if (/verset\s+du\s+tr[oô]ne|ayat\s+al-kursi|ayatu\s+al-kursi/i.test(normalizedText)) {
    const key = 'quran:2:255';
    foundItems.set(key, {
      id: 'quran-2-255',
      type: 'Quran',
      name: 'Sourate Al-Baqara (2:255 - Verset du Trône)',
      rawText: 'Verset du Trône (Ayat al-Kursi)',
      normalizedKey: key,
      sourceRole,
      messageIndex,
      metadata: {
        surahName: 'Al-Baqara',
        surahNumber: 2,
        ayahNumber: 255,
        description: 'Ayat al-Kursi (Verset du Trône)'
      }
    });
  }

  // Pattern 2: Sourate [Nom/Numéro] verset [Numéro(s)] ou Sourate [Nom] (X:Y)
  const surahVerseRegex = /(?:sourate|surah)\s+([a-zA-ZÀ-ÿ0-9'\s-]+?)(?:,|\s+)?(?:verset|ayah|vers|v\.)\s*(\d+(?:\s*[-–]\s*\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = surahVerseRegex.exec(normalizedText)) !== null) {
    const rawSurah = m[1].trim();
    const ayahStr = m[2].trim().replace(/\s+/g, '');
    const surahInfo = findSurahByNameOrNumber(rawSurah);
    const surahNum = surahInfo?.number || rawSurah;
    const surahName = surahInfo?.name || `Sourate ${rawSurah}`;
    const key = `quran:${surahNum}:${ayahStr}`.toLowerCase();
    
    foundItems.set(key, {
      id: `quran-${surahNum}-${ayahStr}`,
      type: 'Quran',
      name: `${surahName} (${surahNum}:${ayahStr})`,
      rawText: m[0],
      normalizedKey: key,
      sourceRole,
      messageIndex,
      metadata: {
        surahName,
        surahNumber: typeof surahNum === 'number' ? surahNum : undefined,
        ayahNumber: ayahStr
      }
    });
  }

  // Pattern 3: Explicit notation (Sourate X:Y ou X:Y)
  // e.g. (39:53), [6:164], Coran 4:34, Sourate 2:255
  const directColonRegex = /(?:coran|sourate|surah|qur['\u2019]an)?\s*[\(\[]?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)\s*[\)\]]?/gi;
  while ((m = directColonRegex.exec(normalizedText)) !== null) {
    const sNum = parseInt(m[1], 10);
    const aNum = m[2].replace(/\s+/g, '');
    // Validate that sNum is between 1 and 114
    if (sNum >= 1 && sNum <= 114) {
      const surahInfo = findSurahByNameOrNumber(sNum);
      const surahName = surahInfo?.name || `Sourate ${sNum}`;
      const key = `quran:${sNum}:${aNum}`.toLowerCase();
      if (!foundItems.has(key)) {
        foundItems.set(key, {
          id: `quran-${sNum}-${aNum}`,
          type: 'Quran',
          name: `${surahName} (${sNum}:${aNum})`,
          rawText: m[0],
          normalizedKey: key,
          sourceRole,
          messageIndex,
          metadata: {
            surahName,
            surahNumber: sNum,
            ayahNumber: aNum
          }
        });
      }
    }
  }

  // Pattern 4: Standalone Sourate name mentions (e.g. "Sourate Al-Baqara", "dans la sourate Al-Ikhlas")
  const standaloneSurahRegex = /(?:sourate|surah)\s+([a-zA-ZÀ-ÿ'\s-]+)/gi;
  while ((m = standaloneSurahRegex.exec(normalizedText)) !== null) {
    const rawName = m[1].split(/[,.;:!?()\[\]]|\s+(?:dit|parle|est|a|pour|dans|qui)/i)[0].trim();
    const surahInfo = findSurahByNameOrNumber(rawName);
    if (surahInfo) {
      const key = `quran:${surahInfo.number}`;
      // Only set if we haven't already indexed a specific verse for this surah
      const alreadyHasSpecificVerse = Array.from(foundItems.keys()).some(k => k.startsWith(`quran:${surahInfo.number}:`));
      if (!alreadyHasSpecificVerse && !foundItems.has(key)) {
        foundItems.set(key, {
          id: `quran-${surahInfo.number}`,
          type: 'Quran',
          name: `Sourate ${surahInfo.name} (${surahInfo.number})`,
          rawText: m[0],
          normalizedKey: key,
          sourceRole,
          messageIndex,
          metadata: {
            surahName: surahInfo.name,
            surahNumber: surahInfo.number
          }
        });
      }
    }
  }

  // 2. EXTRACT HADITH REFERENCES
  // Famous Hadith titles
  if (/hadith\s+(?:des|sur\s+les)\s+intentions|actions\s+ne\s+valent\s+que\s+par\s+les\s+intentions/i.test(normalizedText)) {
    const key = 'hadith:intentions';
    foundItems.set(key, {
      id: 'hadith-intentions',
      type: 'Hadith',
      name: 'Hadith des actions selon les intentions (Al-Bukhari n°1 / Muslim n°1907)',
      rawText: 'Hadith des intentions',
      normalizedKey: key,
      sourceRole,
      messageIndex,
      metadata: {
        collection: 'Sahih Al-Bukhari & Sahih Muslim',
        hadithNumber: '1',
        narrator: 'Omar ibn Al-Khattab',
        description: 'Innamal a\'malu bin-niyyat'
      }
    });
  }

  if (/hadith\s+jibril|hadith\s+de\s+gabriel/i.test(normalizedText)) {
    const key = 'hadith:jibril';
    foundItems.set(key, {
      id: 'hadith-jibril',
      type: 'Hadith',
      name: 'Hadith Jibril (Islam, Iman, Ihsan)',
      rawText: 'Hadith Jibril',
      normalizedKey: key,
      sourceRole,
      messageIndex,
      metadata: {
        collection: 'Sahih Muslim',
        narrator: 'Omar ibn Al-Khattab',
        description: 'Les fondements de l\'Islam, de la Foi et de l\'Excellence'
      }
    });
  }

  // Collections with numbers or citations
  for (const col of HADITH_COLLECTIONS) {
    for (const alias of col.aliases) {
      const aliasPattern = new RegExp(`\\b${alias.replace(/'/g, "['\\u2019]?")}\\b`, 'i');
      if (aliasPattern.test(normalizedText)) {
        // Look for adjacent number e.g. "Al-Bukhari (n° 1)" or "Muslim 1907" or "rapporté par Al-Boukhari"
        const numRegex = new RegExp(`(?:${alias})[\\s\\S]{0,40}?(?:n[°o]|num[ée]ro|hadith)?\\s*([0-9]+)`, 'i');
        const numMatch = normalizedText.match(numRegex);
        const hadithNum = numMatch ? numMatch[1] : undefined;
        
        // Narrator detection adjacent to collection
        const narrRegex = new RegExp(`(?:rapport[ée]\\s+par|selon|d['\\u2019]apr[èe]s)\\s+([A-ZÀ-ÿ][a-zA-ZÀ-ÿ'\\s-]+?)(?:dans|chez|,|\\.|\\()`, 'i');
        const narrMatch = normalizedText.match(narrRegex);
        const narrator = narrMatch ? narrMatch[1].trim() : undefined;

        const key = hadithNum ? `hadith:${col.name.toLowerCase()}:${hadithNum}` : `hadith:${col.name.toLowerCase()}`;
        if (!foundItems.has(key)) {
          foundItems.set(key, {
            id: `hadith-${col.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}${hadithNum ? '-' + hadithNum : ''}`,
            type: 'Hadith',
            name: hadithNum ? `Hadith ${col.name} (n°${hadithNum})` : `Hadith rapporté dans ${col.name}`,
            rawText: numMatch ? numMatch[0] : col.name,
            normalizedKey: key,
            sourceRole,
            messageIndex,
            metadata: {
              collection: col.name,
              hadithNumber: hadithNum,
              narrator
            }
          });
        }
      }
    }
  }

  // Generic hadith citation: e.g. "selon un hadith rapporté par [Nom]"
  const genericHadithRegex = /(?:un\s+hadith|selon\s+le\s+hadith|comme\s+il\s+est\s+dit\s+dans\s+le\s+hadith)\s*(?:rapport[ée]\s+par\s+([a-zA-ZÀ-ÿ'\s-]+?))?(?:,|\s+le\s+proph[èe]te)/gi;
  while ((m = genericHadithRegex.exec(normalizedText)) !== null) {
    const rawNarrator = m[1]?.trim();
    const key = `hadith:generic:${rawNarrator || 'unspecified'}`.toLowerCase();
    if (!foundItems.has(key) && foundItems.size === 0) {
      foundItems.set(key, {
        id: `hadith-generic-${Date.now()}`,
        type: 'Hadith',
        name: rawNarrator ? `Hadith rapporté par ${rawNarrator}` : 'Hadith prophétique cité',
        rawText: m[0],
        normalizedKey: key,
        sourceRole,
        messageIndex,
        metadata: {
          narrator: rawNarrator
        }
      });
    }
  }

  // 3. EXTRACT PEOPLE REFERENCES
  for (const person of PEOPLE) {
    if (person.regex.test(normalizedText)) {
      const key = `people:${person.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (!foundItems.has(key)) {
        foundItems.set(key, {
          id: `people-${person.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          type: 'People',
          name: person.name,
          rawText: person.name,
          normalizedKey: key,
          sourceRole,
          messageIndex,
          metadata: {
            personRole: person.role
          }
        });
      }
    }
  }

  // 4. EXTRACT EVENT REFERENCES
  for (const ev of EVENTS) {
    if (ev.regex.test(normalizedText)) {
      const key = `event:${ev.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (!foundItems.has(key)) {
        foundItems.set(key, {
          id: `event-${ev.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          type: 'Events',
          name: ev.name,
          rawText: ev.name,
          normalizedKey: key,
          sourceRole,
          messageIndex,
          metadata: {
            eventPeriod: ev.period
          }
        });
      }
    }
  }

  // 5. EXTERNAL SOURCES INTEGRATION (if any documents were passed)
  if (Array.isArray(externalSources) && externalSources.length > 0) {
    for (const src of externalSources) {
      if (src.title || src.url) {
        // Also extract references contained inside the source title/content
        if (src.title) {
          const subRefs = extractReferencedItems(src.title, sourceRole, messageIndex);
          for (const sub of subRefs) {
            if (!foundItems.has(sub.normalizedKey)) {
              foundItems.set(sub.normalizedKey, sub);
            }
          }
        }
      }
    }
  }

  return Array.from(foundItems.values());
}
