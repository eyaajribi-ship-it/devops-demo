const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../src/app");

// Base de données en mémoire : les tests de la CI n'ont pas besoin de PostgreSQL.
function faussePool() {
  const users = [];
  const programs = [];
  let uid = 1;
  let pid = 1;
  return {
    async query(sql, params = []) {
      if (sql.startsWith("INSERT INTO users")) {
        if (users.some((u) => u.email === params[1])) {
          const e = new Error("duplicate");
          e.code = "23505";
          throw e;
        }
        const u = { id: uid++, name: params[0], email: params[1], password_hash: params[2] };
        users.push(u);
        return { rows: [{ id: u.id, name: u.name }] };
      }
      if (sql.startsWith("SELECT id, name, password_hash")) {
        return { rows: users.filter((u) => u.email === params[0]) };
      }
      if (sql.startsWith("INSERT INTO programs")) {
        const p = {
          id: pid++,
          user_id: params[0],
          destination: params[1],
          nb_jours: params[2],
          budget: params[3],
          content: params[4],
          created_at: new Date().toISOString(),
        };
        programs.push(p);
        return { rows: [p] };
      }
      if (sql.startsWith("DELETE FROM programs")) {
        const avant = programs.length;
        const reste = programs.filter((p) => !(p.id === params[0] && p.user_id === params[1]));
        programs.length = 0;
        programs.push(...reste);
        return { rowCount: avant - reste.length };
      }
      if (sql.includes("FROM programs WHERE user_id")) {
        return { rows: programs.filter((p) => p.user_id === params[0]) };
      }
      if (sql.includes("FROM programs WHERE id")) {
        return { rows: programs.filter((p) => p.id === params[0] && p.user_id === params[1]) };
      }
      throw new Error("Requête non prévue : " + sql);
    },
  };
}

async function demarrer(t) {
  const app = createApp({ pool: faussePool(), jwtSecret: "test" });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const appel = async (chemin, { method = "GET", body, token } = {}) => {
    const res = await fetch(base + chemin, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const texte = await res.text();
    return { status: res.status, data: texte ? JSON.parse(texte) : null };
  };
  return { server, appel };
}

test("GET /health répond avec un statut", async (t) => {
  const { appel } = await demarrer(t);
  const r = await appel("/health");
  assert.strictEqual(r.status, 200);
  assert.ok(["ok", "healthy"].includes(r.data.status));
});

test("inscription, doublon et connexion", async (t) => {
  const { appel } = await demarrer(t);
  const nouveau = { name: "Eya", email: "eya@test.tn", password: "secret123" };
  const a = await appel("/api/auth/register", { method: "POST", body: nouveau });
  assert.strictEqual(a.status, 201);
  assert.ok(a.data.token);

  const doublon = await appel("/api/auth/register", { method: "POST", body: nouveau });
  assert.strictEqual(doublon.status, 409);

  const ok = await appel("/api/auth/login", {
    method: "POST",
    body: { email: "eya@test.tn", password: "secret123" },
  });
  assert.strictEqual(ok.status, 200);

  const mauvais = await appel("/api/auth/login", {
    method: "POST",
    body: { email: "eya@test.tn", password: "faux" },
  });
  assert.strictEqual(mauvais.status, 401);
});

test("l'inscription refuse des données invalides", async (t) => {
  const { appel } = await demarrer(t);
  const r = await appel("/api/auth/register", {
    method: "POST",
    body: { name: "Eya", email: "pas-un-email", password: "123" },
  });
  assert.strictEqual(r.status, 400);
});

test("les routes de programmes exigent une connexion", async (t) => {
  const { appel } = await demarrer(t);
  const r = await appel("/api/programs");
  assert.strictEqual(r.status, 401);
});

test("générer, sauvegarder, consulter puis supprimer un programme", async (t) => {
  const { appel } = await demarrer(t);
  const { data } = await appel("/api/auth/register", {
    method: "POST",
    body: { name: "Eya", email: "eya@test.tn", password: "secret123" },
  });
  const token = data.token;

  const genere = await appel("/api/programs/generate", {
    method: "POST",
    token,
    body: { destination: "Tunis", days: 3, budget: 600 },
  });
  assert.strictEqual(genere.status, 200);
  assert.strictEqual(genere.data.jours.length, 3);

  const invalide = await appel("/api/programs/generate", {
    method: "POST",
    token,
    body: { destination: "Tunis", days: 99, budget: 600 },
  });
  assert.strictEqual(invalide.status, 400);

  const sauve = await appel("/api/programs", {
    method: "POST",
    token,
    body: { programme: genere.data },
  });
  assert.strictEqual(sauve.status, 201);

  const liste = await appel("/api/programs", { token });
  assert.strictEqual(liste.data.length, 1);

  const un = await appel(`/api/programs/${sauve.data.id}`, { token });
  assert.strictEqual(un.status, 200);
  assert.strictEqual(un.data.content.destination, "Tunis");

  const supprime = await appel(`/api/programs/${sauve.data.id}`, { method: "DELETE", token });
  assert.strictEqual(supprime.status, 204);

  const apres = await appel("/api/programs", { token });
  assert.strictEqual(apres.data.length, 0);
});
