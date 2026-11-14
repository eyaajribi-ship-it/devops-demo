// Petit client pour l'API de TounesTrip.
const CLE = "tounestrip_session";

export function lireSession() {
  try {
    return JSON.parse(localStorage.getItem(CLE));
  } catch {
    return null;
  }
}

export function ecrireSession(session) {
  try {
    if (session) localStorage.setItem(CLE, JSON.stringify(session));
    else localStorage.removeItem(CLE);
  } catch {
    /* stockage indisponible : on continue sans mémoriser */
  }
}

async function appeler(chemin, { method = "GET", body, token } = {}) {
  const res = await fetch(chemin, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texte = await res.text();
  const data = texte ? JSON.parse(texte) : null;
  if (!res.ok) {
    const erreur = new Error((data && data.error) || "Une erreur est survenue.");
    erreur.status = res.status;
    throw erreur;
  }
  return data;
}

export const api = {
  inscription: (body) => appeler("/api/auth/register", { method: "POST", body }),
  connexion: (body) => appeler("/api/auth/login", { method: "POST", body }),
  generer: (token, body) => appeler("/api/programs/generate", { method: "POST", body, token }),
  sauvegarder: (token, programme) =>
    appeler("/api/programs", { method: "POST", body: { programme }, token }),
  lister: (token) => appeler("/api/programs", { token }),
  lire: (token, id) => appeler(`/api/programs/${id}`, { token }),
  supprimer: (token, id) => appeler(`/api/programs/${id}`, { method: "DELETE", token }),
};
