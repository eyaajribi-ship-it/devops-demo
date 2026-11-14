const { Pool } = require("pg");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  nb_jours INTEGER NOT NULL,
  budget NUMERIC NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

function createPool(connectionString) {
  return new Pool({ connectionString });
}

// La base peut démarrer un peu après l'application : on réessaie quelques fois.
async function initSchema(pool, tentatives = 15, delaiMs = 2000) {
  for (let i = 1; i <= tentatives; i += 1) {
    try {
      await pool.query(SCHEMA);
      return;
    } catch (err) {
      if (i === tentatives) throw err;
      console.log(`Base de données indisponible (${i}/${tentatives}), nouvel essai...`);
      await new Promise((resolve) => setTimeout(resolve, delaiMs));
    }
  }
}

module.exports = { createPool, initSchema, SCHEMA };
