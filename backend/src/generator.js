// Générateur de programmes de voyage (version simulée, sans API externe).
// À partir d'une destination, d'une durée et d'un budget, il construit un
// programme jour par jour : matin, après-midi et soir, avec un coût estimé.

const DESTINATIONS = {
  tunis: {
    nom: "Tunis",
    sites: [
      { nom: "Médina de Tunis et souks", cout: 0 },
      { nom: "Mosquée Zitouna", cout: 10 },
      { nom: "Musée national du Bardo", cout: 15 },
      { nom: "Cité de la culture", cout: 0 },
      { nom: "Site archéologique de Carthage", cout: 12 },
      { nom: "Thermes d'Antonin", cout: 12 },
    ],
    restaurants: [
      { nom: "Dar El Jeld (cuisine tunisienne raffinée)", cout: 55 },
      { nom: "Le Malouf, spécialités de la médina", cout: 25 },
      { nom: "Fricassé et brik dans un café de la médina", cout: 8 },
    ],
  },
  "sidi bou said": {
    nom: "Sidi Bou Saïd",
    sites: [
      { nom: "Ruelles bleues et blanches du village", cout: 0 },
      { nom: "Café des Nattes", cout: 6 },
      { nom: "Palais Ennejma Ezzahra", cout: 10 },
      { nom: "Port de plaisance de Sidi Bou Saïd", cout: 0 },
      { nom: "Plage de La Marsa", cout: 0 },
    ],
    restaurants: [
      { nom: "Dar Zarrouk, vue sur la baie", cout: 60 },
      { nom: "Café Sidi Chabaane, thé aux pignons", cout: 10 },
      { nom: "Poisson grillé au port", cout: 30 },
    ],
  },
  hammamet: {
    nom: "Hammamet",
    sites: [
      { nom: "Médina et fort de Hammamet", cout: 8 },
      { nom: "Jardins de la villa Sebastian", cout: 10 },
      { nom: "Plage de Hammamet", cout: 0 },
      { nom: "Carthageland", cout: 40 },
      { nom: "Excursion à Yasmine Hammamet", cout: 15 },
    ],
    restaurants: [
      { nom: "Restaurant en bord de mer", cout: 35 },
      { nom: "Pizzeria de la médina", cout: 12 },
      { nom: "Dîner tunisien à Yasmine", cout: 28 },
    ],
  },
  sousse: {
    nom: "Sousse",
    sites: [
      { nom: "Médina de Sousse (UNESCO)", cout: 0 },
      { nom: "Ribat de Sousse", cout: 10 },
      { nom: "Musée archéologique de Sousse", cout: 12 },
      { nom: "Catacombes", cout: 8 },
      { nom: "Port El Kantaoui", cout: 0 },
      { nom: "Plage de Boujaffar", cout: 0 },
    ],
    restaurants: [
      { nom: "Poisson frais sur le port", cout: 32 },
      { nom: "Couscous au poisson dans la médina", cout: 20 },
      { nom: "Café maure de la Kasbah", cout: 6 },
    ],
  },
  djerba: {
    nom: "Djerba",
    sites: [
      { nom: "Houmt Souk et son marché", cout: 0 },
      { nom: "Synagogue de la Ghriba", cout: 8 },
      { nom: "Fort Ghazi Mustapha", cout: 8 },
      { nom: "Djerbahood, village d'art urbain", cout: 0 },
      { nom: "Plage de Sidi Mahrez", cout: 0 },
      { nom: "Tour en quad ou à dos de dromadaire", cout: 45 },
    ],
    restaurants: [
      { nom: "Poisson et fruits de mer à Houmt Souk", cout: 30 },
      { nom: "Dîner de spécialités djerbiennes", cout: 25 },
      { nom: "Brik et jus frais au marché", cout: 7 },
    ],
  },
  tozeur: {
    nom: "Tozeur",
    sites: [
      { nom: "Palmeraie de Tozeur", cout: 8 },
      { nom: "Médina d'Ouled El Hadef", cout: 0 },
      { nom: "Chott el-Jérid en 4x4", cout: 55 },
      { nom: "Oasis de montagne de Chebika et Tamerza", cout: 40 },
      { nom: "Décor de Star Wars à Mos Espa", cout: 25 },
    ],
    restaurants: [
      { nom: "Tajine aux dattes dans la palmeraie", cout: 22 },
      { nom: "Dîner sous tente berbère", cout: 35 },
      { nom: "Sandwich et thé à la menthe en ville", cout: 6 },
    ],
  },
};

const GENERIQUE = {
  sites: [
    { nom: "Découverte du centre-ville et de la médina", cout: 0 },
    { nom: "Visite du musée principal", cout: 12 },
    { nom: "Promenade dans le marché local", cout: 0 },
    { nom: "Site historique incontournable", cout: 10 },
    { nom: "Balade au bord de la mer ou dans les jardins", cout: 0 },
  ],
  restaurants: [
    { nom: "Restaurant local de cuisine tunisienne", cout: 22 },
    { nom: "Café traditionnel et pâtisseries", cout: 6 },
    { nom: "Dîner de spécialités régionales", cout: 30 },
  ],
};

function normaliser(texte) {
  return String(texte || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function niveauBudget(budgetParJour) {
  if (budgetParJour < 60) return "économique";
  if (budgetParJour < 150) return "confortable";
  return "premium";
}

function valider({ destination, days, budget }) {
  const erreurs = [];
  if (!destination || String(destination).trim().length < 2) {
    erreurs.push("La destination est obligatoire.");
  }
  const d = Number(days);
  if (!Number.isInteger(d) || d < 1 || d > 14) {
    erreurs.push("La durée doit être un nombre entier de jours entre 1 et 14.");
  }
  const b = Number(budget);
  if (!Number.isFinite(b) || b < 20 || b > 100000) {
    erreurs.push("Le budget doit être compris entre 20 et 100000 dinars.");
  }
  return erreurs;
}

// Parcourt la liste de façon circulaire. À chaque nouveau tour, l'ordre est
// décalé d'un cran pour éviter que deux jours soient identiques.
// Le résultat reste le même pour les mêmes entrées.
function choisir(liste, index) {
  const tour = Math.floor(index / liste.length);
  return liste[(index + tour) % liste.length];
}

function genererProgramme({ destination, days, budget }) {
  const erreurs = valider({ destination, days, budget });
  if (erreurs.length > 0) {
    const e = new Error(erreurs.join(" "));
    e.status = 400;
    throw e;
  }

  const nbJours = Number(days);
  const budgetTotal = Number(budget);
  const budgetParJour = Math.round(budgetTotal / nbJours);
  const niveau = niveauBudget(budgetParJour);

  const cle = normaliser(destination);
  const connue = DESTINATIONS[cle];
  const nomDestination = connue ? connue.nom : String(destination).trim();
  const donnees = connue || GENERIQUE;

  // Le niveau de budget décale le choix des lieux : un budget plus élevé
  // fait passer en premier les activités payantes.
  const sites = [...donnees.sites].sort((a, b) =>
    niveau === "économique" ? a.cout - b.cout : b.cout - a.cout
  );
  const restaurants = [...donnees.restaurants].sort((a, b) =>
    niveau === "économique" ? a.cout - b.cout : b.cout - a.cout
  );

  const jours = [];
  for (let i = 0; i < nbJours; i += 1) {
    const matin = choisir(sites, i * 2);
    const apresMidi = choisir(sites, i * 2 + 1);
    const soir = choisir(restaurants, i);
    const coutEstime = matin.cout + apresMidi.cout + soir.cout;

    jours.push({
      jour: i + 1,
      titre:
        i === 0
          ? `Arrivée et premières découvertes à ${nomDestination}`
          : i === nbJours - 1 && nbJours > 1
            ? `Dernières visites et départ de ${nomDestination}`
            : `Jour ${i + 1} à ${nomDestination}`,
      matin: matin.nom,
      apresMidi: apresMidi.nom,
      soir: soir.nom,
      coutEstime,
    });
  }

  const totalEstime = jours.reduce((somme, j) => somme + j.coutEstime, 0);

  return {
    destination: nomDestination,
    nbJours,
    budget: budgetTotal,
    budgetParJour,
    niveau,
    jours,
    totalEstime,
    resteBudget: budgetTotal - totalEstime,
  };
}

module.exports = { genererProgramme, valider, normaliser, niveauBudget };
