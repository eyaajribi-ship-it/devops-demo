const { createApp } = require("./app");
const { createPool, initSchema } = require("./db");

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://tounestrip:tounestrip@localhost:5432/tounestrip";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-a-changer";

async function main() {
  const pool = createPool(DATABASE_URL);
  await initSchema(pool);
  const app = createApp({ pool, jwtSecret: JWT_SECRET });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TounesTrip démarré sur le port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Impossible de démarrer l'application :", err);
  process.exit(1);
});
