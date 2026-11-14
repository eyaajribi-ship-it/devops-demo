const test = require("node:test");
const assert = require("node:assert");
const { genererProgramme, niveauBudget, normaliser } = require("../src/generator");

test("génère autant de jours que demandé", () => {
  const p = genererProgramme({ destination: "Tunis", days: 4, budget: 800 });
  assert.strictEqual(p.jours.length, 4);
  assert.strictEqual(p.destination, "Tunis");
  assert.strictEqual(p.budgetParJour, 200);
});

test("chaque jour a un matin, un après-midi, un soir et un coût", () => {
  const p = genererProgramme({ destination: "Djerba", days: 3, budget: 600 });
  for (const j of p.jours) {
    assert.ok(j.matin && j.apresMidi && j.soir);
    assert.strictEqual(typeof j.coutEstime, "number");
  }
});

test("reconnaît une destination avec accents et majuscules", () => {
  const p = genererProgramme({ destination: "  SIDI Bou Saïd ", days: 2, budget: 300 });
  assert.strictEqual(p.destination, "Sidi Bou Saïd");
});

test("une destination inconnue utilise un programme générique", () => {
  const p = genererProgramme({ destination: "Kairouan", days: 2, budget: 300 });
  assert.strictEqual(p.destination, "Kairouan");
  assert.strictEqual(p.jours.length, 2);
});

test("le résultat est identique pour les mêmes entrées", () => {
  const a = genererProgramme({ destination: "Sousse", days: 5, budget: 500 });
  const b = genererProgramme({ destination: "Sousse", days: 5, budget: 500 });
  assert.deepStrictEqual(a, b);
});

test("le total estimé est la somme des jours", () => {
  const p = genererProgramme({ destination: "Hammamet", days: 3, budget: 450 });
  const somme = p.jours.reduce((s, j) => s + j.coutEstime, 0);
  assert.strictEqual(p.totalEstime, somme);
  assert.strictEqual(p.resteBudget, 450 - somme);
});

test("le niveau dépend du budget par jour", () => {
  assert.strictEqual(niveauBudget(40), "économique");
  assert.strictEqual(niveauBudget(100), "confortable");
  assert.strictEqual(niveauBudget(300), "premium");
});

test("refuse des données invalides", () => {
  assert.throws(() => genererProgramme({ destination: "", days: 3, budget: 300 }), /destination/i);
  assert.throws(() => genererProgramme({ destination: "Tunis", days: 0, budget: 300 }), /durée/i);
  assert.throws(() => genererProgramme({ destination: "Tunis", days: 3, budget: 5 }), /budget/i);
});

test("normaliser retire accents, apostrophes et espaces en trop", () => {
  assert.strictEqual(normaliser("  Sidi Bou  Saïd "), "sidi bou said");
});

test("le dernier jour ne répète pas le premier quand la liste est assez longue", () => {
  const p = genererProgramme({ destination: "Djerba", days: 4, budget: 800 });
  const premier = p.jours[0];
  const dernier = p.jours[3];
  assert.notDeepStrictEqual(
    [premier.matin, premier.apresMidi, premier.soir],
    [dernier.matin, dernier.apresMidi, dernier.soir]
  );
});
