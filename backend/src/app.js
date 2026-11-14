const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { genererProgramme } = require("./generator");

function createApp({ pool, jwtSecret }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Route de supervision : appelée par Uptime Kuma.
  app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  function signer(user) {
    return jwt.sign({ id: user.id, name: user.name }, jwtSecret, { expiresIn: "7d" });
  }

  function authentifier(req, res, next) {
    const entete = req.headers.authorization || "";
    const token = entete.startsWith("Bearer ") ? entete.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Connexion requise." });
    try {
      req.user = jwt.verify(token, jwtSecret);
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Session expirée, reconnecte-toi." });
    }
  }

  // 1. Inscription et connexion
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nom, e-mail et mot de passe sont obligatoires." });
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: "L'adresse e-mail n'est pas valide." });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
      }
      const hash = await bcrypt.hash(String(password), 10);
      try {
        const { rows } = await pool.query(
          "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name",
          [String(name).trim(), String(email).trim().toLowerCase(), hash]
        );
        return res.status(201).json({ token: signer(rows[0]), user: rows[0] });
      } catch (err) {
        if (err.code === "23505") {
          return res.status(409).json({ error: "Cette adresse e-mail est déjà utilisée." });
        }
        throw err;
      }
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail et mot de passe sont obligatoires." });
      }
      const { rows } = await pool.query(
        "SELECT id, name, password_hash FROM users WHERE email = $1",
        [String(email).trim().toLowerCase()]
      );
      const user = rows[0];
      if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
        return res.status(401).json({ error: "E-mail ou mot de passe incorrect." });
      }
      return res.json({ token: signer(user), user: { id: user.id, name: user.name } });
    } catch (err) {
      return next(err);
    }
  });

  // 2 et 3. Saisir destination, durée, budget, puis générer le programme
  app.post("/api/programs/generate", authentifier, (req, res, next) => {
    try {
      const { destination, days, budget } = req.body || {};
      res.json(genererProgramme({ destination, days, budget }));
    } catch (err) {
      next(err);
    }
  });

  // 4. Sauvegarder et consulter
  app.post("/api/programs", authentifier, async (req, res, next) => {
    try {
      const { programme } = req.body || {};
      if (!programme || !Array.isArray(programme.jours) || !programme.destination) {
        return res.status(400).json({ error: "Le programme à sauvegarder est invalide." });
      }
      const { rows } = await pool.query(
        `INSERT INTO programs (user_id, destination, nb_jours, budget, content)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, destination, nb_jours, budget::float8 AS budget, created_at`,
        [req.user.id, programme.destination, programme.nbJours, programme.budget, programme]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/programs", authentifier, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, destination, nb_jours, budget::float8 AS budget, created_at
         FROM programs WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.user.id]
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/programs/:id", authentifier, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, content, created_at FROM programs WHERE id = $1 AND user_id = $2",
        [Number(req.params.id) || 0, req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Programme introuvable." });
      return res.json(rows[0]);
    } catch (err) {
      return next(err);
    }
  });

  // 5. Supprimer
  app.delete("/api/programs/:id", authentifier, async (req, res, next) => {
    try {
      const { rowCount } = await pool.query(
        "DELETE FROM programs WHERE id = $1 AND user_id = $2",
        [Number(req.params.id) || 0, req.user.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: "Programme introuvable." });
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  // Front-end React compilé, servi par la même application (une seule image Docker).
  const publicDir = path.join(__dirname, "..", "public");
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get(/^\/(?!api\/|health).*/, (req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? "Erreur interne du serveur." : err.message });
  });

  return app;
}

module.exports = { createApp };
