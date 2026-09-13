export interface StarterQuestion {
  id: string;
  category: string;
  title: string;
  desc: string;
  query: string;
}

export interface StarterCategory {
  name: string;
  questions: Omit<StarterQuestion, 'category'>[];
}

export const STARTER_CATEGORIES: StarterCategory[] = [
  {
    name: 'Prière et Purification',
    questions: [
      {
        id: 'p-1',
        title: 'Rattrapage des prières',
        desc: 'Comment rattraper des prières obligatoires manquées dans le passé ?',
        query: 'Comment rattraper des prières obligatoires manquées dans le passé selon les écoles juridiques ?'
      },
      {
        id: 'p-2',
        title: 'Conditions de validité',
        desc: 'Quelles sont les conditions indispensables pour que la prière soit valide ?',
        query: 'Quelles sont les conditions de validité indispensables pour la prière rituelle ?'
      },
      {
        id: 'p-3',
        title: 'Prière en voyage',
        desc: 'Quelles sont les règles pour raccourcir et regrouper les prières ?',
        query: 'Quelles sont les règles et conditions pour raccourcir et regrouper les prières en voyage ?'
      },
      {
        id: 'p-4',
        title: 'Oubli dans la prière',
        desc: 'Comment réparer un oubli ou un doute avec la prosternation de distraction ?',
        query: "Comment accomplir la prosternation de distraction (Sujud as-Sahw) en cas d'oubli ou de doute dans la prière ?"
      },
      {
        id: 'p-5',
        title: 'Annulation des ablutions',
        desc: 'Un saignement, une prise de sang ou le sommeil annulent-ils les ablutions ?',
        query: 'Un saignement, une prise de sang ou un assoupissement annulent-ils les ablutions ?'
      }
    ]
  },
  {
    name: 'Jeûne et Ramadan',
    questions: [
      {
        id: 'j-1',
        title: 'Actes annulant le jeûne',
        desc: 'Quels sont les actes et soins médicaux qui invalident le jeûne ?',
        query: 'Quels sont les actes, soins médicaux et situations qui annulent ou n’annulent pas le jeûne ?'
      },
      {
        id: 'j-2',
        title: 'Fidya et maladie durable',
        desc: 'Comment s’acquitter de la compensation si l’on ne peut pas jeûner ?',
        query: 'Comment s’acquitter de la Fidya (compensation) pour une personne atteinte d’une maladie permanente ou incurable ?'
      },
      {
        id: 'j-3',
        title: 'Rattrapage et Chawwal',
        desc: 'Peut-on cumuler l’intention des six jours de Chawwal et du rattrapage ?',
        query: 'Peut-on combiner l’intention des six jours de Chawwal avec le rattrapage des jours manqués de Ramadan ?'
      },
      {
        id: 'j-4',
        title: 'Jeûne un jour sur deux',
        desc: 'Est-il permis de rattraper ses jours de Ramadan de manière espacée ?',
        query: 'Est-il permis de jeûner un jour sur deux pour rattraper les jours manqués du mois de Ramadan ?'
      },
      {
        id: 'j-5',
        title: 'Retard de rattrapage',
        desc: 'Que faire si l’on n’a pas rattrapé ses jours avant le Ramadan suivant ?',
        query: 'Que doit faire une personne qui a retardé le rattrapage de son jeûne jusqu’à l’arrivée du Ramadan suivant ?'
      }
    ]
  },
  {
    name: 'Zakât et Finances',
    questions: [
      {
        id: 'z-1',
        title: 'Calcul de la Zakât al-Maal',
        desc: 'Comment calculer le seuil du Nisab et le montant dû sur son épargne ?',
        query: 'Comment calculer le seuil du Nisab et le montant de la Zakât al-Maal sur mon épargne bancaire ?'
      },
      {
        id: 'z-2',
        title: 'Zakât al-Fitr en argent ou nourriture',
        desc: 'Quelles sont les divergences sur le versement de la Zakât en monnaie ?',
        query: 'Quelles sont les positions des quatre écoles sur le versement de la Zakât al-Fitr en argent liquide ou en nourriture ?'
      },
      {
        id: 'z-3',
        title: 'Bénéficiaires de la Zakât',
        desc: 'Peut-on verser sa Zakât à des proches ou membres de sa famille ?',
        query: 'Est-il permis de donner la Zakât al-Maal à des membres de sa propre famille dans le besoin ?'
      },
      {
        id: 'z-4',
        title: 'Investissement boursier',
        desc: 'Quels critères définissent un investissement conforme à l’éthique islamique ?',
        query: 'Quelles sont les règles régissant l’investissement en bourse et en actions selon la jurisprudence islamique ?'
      },
      {
        id: 'z-5',
        title: 'Dettes et Zakât',
        desc: 'Comment les dettes personnelles et les prêts influencent-ils le calcul ?',
        query: 'Comment prendre en compte les dettes et les crédits lors du calcul de la Zakât al-Maal ?'
      }
    ]
  },
  {
    name: 'Vie quotidienne et Éthique',
    questions: [
      {
        id: 'q-1',
        title: 'Consommation et viande',
        desc: 'Quelles sont les conditions requises pour qu’une viande soit licite (halal) ?',
        query: 'Quelles sont les conditions nécessaires pour qu’une viande soit considérée comme licite (halal) à la consommation ?'
      },
      {
        id: 'q-2',
        title: 'Musique et instruments',
        desc: 'Quelles sont les positions des savants sur la musique et les instruments ?',
        query: 'Quels sont les avis et arguments des différentes écoles au sujet de la musique et des instruments de musique ?'
      },
      {
        id: 'q-3',
        title: 'Limites vestimentaires',
        desc: 'Quelles sont les limites de la pudeur corporelle (Awra) en islam ?',
        query: 'Quelles sont les limites précises de la nudité à couvrir (Awra) pour l’homme et la femme selon les écoles ?'
      },
      {
        id: 'q-4',
        title: 'Médicaments et alcool',
        desc: 'Peut-on utiliser des cosmétiques ou médicaments contenant de l’éthanol ?',
        query: 'Est-il permis d’utiliser des parfums, cosmétiques ou médicaments contenant de l’éthanol ou de l’alcool dénaturé ?'
      },
      {
        id: 'q-5',
        title: 'Prière sur le lieu de travail',
        desc: 'Comment concilier les impératifs professionnels et l’accomplissement des prières ?',
        query: 'Comment concilier les horaires professionnels et l’accomplissement de la prière à son heure au travail ?'
      }
    ]
  },
  {
    name: 'Spiritualité et Coran',
    questions: [
      {
        id: 's-1',
        title: 'Conditions du repentir',
        desc: 'Quelles sont les étapes pour un repentir sincère et agréé (Tawbah Nasuhah) ?',
        query: 'Quelles sont les conditions indispensables pour que le repentir sincère (Tawbah) soit agréé par Allah ?'
      },
      {
        id: 's-2',
        title: 'Prière de consultation',
        desc: 'Comment accomplir Salat al-Istikhara et comment en interpréter le signe ?',
        query: 'Comment s’accomplit la prière de consultation (Salat al-Istikhara) et comment savoir vers quoi s’orienter ?'
      },
      {
        id: 's-3',
        title: 'Lecture du Coran',
        desc: 'Comment instaurer une routine régulière de lecture et de méditation coranique ?',
        query: 'Quelle méthode adopter pour lire et méditer régulièrement le Coran sans abandonner avec le temps ?'
      },
      {
        id: 's-4',
        title: 'Hadith Qoudsi et Coran',
        desc: 'Quelle différence existe-t-il entre la parole d’Allah dans le Coran et le Hadith Qoudsi ?',
        query: 'Quelle est la distinction fondamentale entre un verset du Coran et un Hadith Qoudsi ?'
      },
      {
        id: 's-5',
        title: 'Invocations recommandées',
        desc: 'Quelles sont les invocations essentielles du matin et du soir (Adhkar) ?',
        query: 'Quelles sont les invocations du matin et du soir (Adhkar) les plus recommandées selon la Sunnah authentique ?'
      }
    ]
  },
  {
    name: 'Famille et Relations',
    questions: [
      {
        id: 'f-1',
        title: 'Droits entre époux',
        desc: 'Quels sont les droits et devoirs mutuels dans le couple selon la Sunnah ?',
        query: 'Quels sont les principaux droits et devoirs mutuels entre époux selon les enseignements de l’islam ?'
      },
      {
        id: 'f-2',
        title: 'Respect des parents',
        desc: 'Comment pratiquer la bienfaisance envers les parents face à des désaccords ?',
        query: 'Comment pratiquer la piété filiale (Birr al-Walidayn) envers ses parents en cas de désaccord sur des choix de vie ?'
      },
      {
        id: 'f-3',
        title: 'Conditions du mariage',
        desc: 'Quelles sont les conditions requises pour la validité du contrat de mariage ?',
        query: 'Quels sont les piliers et conditions obligatoires pour la validité du contrat de mariage musulman (Nikah) ?'
      },
      {
        id: 'f-4',
        title: 'Liens de parenté',
        desc: 'Comment maintenir les liens de parenté même en cas de rupture de l’autre côté ?',
        query: 'Comment préserver les liens de parenté (Silat ar-Rahim) lorsque certains membres de la famille s’éloignent ou coupent contact ?'
      }
    ]
  }
];

/**
 * Pioche 3 questions aléatoires parmi 3 catégories distinctes
 * pour garantir une diversité organisée et sans doublons thématiques.
 */
export function getRandomStarterQuestions(count: number = 3): StarterQuestion[] {
  // Mélanger les catégories
  const shuffledCategories = [...STARTER_CATEGORIES].sort(() => 0.5 - Math.random());
  const selectedCategories = shuffledCategories.slice(0, Math.min(count, shuffledCategories.length));

  const result: StarterQuestion[] = [];

  for (const cat of selectedCategories) {
    if (cat.questions.length > 0) {
      const randomQuestion = cat.questions[Math.floor(Math.random() * cat.questions.length)];
      result.push({
        ...randomQuestion,
        category: cat.name
      });
    }
  }

  return result;
}
