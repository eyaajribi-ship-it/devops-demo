import { useEffect, useState } from "react";
import { api, ecrireSession, lireSession } from "./api.js";

const DESTINATIONS = ["Tunis", "Sidi Bou Saïd", "Hammamet", "Sousse", "Djerba", "Tozeur"];

function formaterDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function Auth({ onConnecte }) {
  const [mode, setMode] = useState("connexion");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const changer = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const rep =
        mode === "connexion"
          ? await api.connexion({ email: form.email, password: form.password })
          : await api.inscription(form);
      onConnecte({ token: rep.token, nom: rep.user.name });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-intro">
        <h1>TounesTrip</h1>
        <p className="accroche">Ton programme de voyage en Tunisie, jour par jour.</p>
        <ul className="points">
          <li>Choisis ta destination, ta durée et ton budget</li>
          <li>Reçois un programme avec matin, après-midi et soir</li>
          <li>Sauvegarde-le et retrouve-le quand tu veux</li>
        </ul>
      </section>

      <form className="carte auth-form" onSubmit={envoyer}>
        <h2>{mode === "connexion" ? "Connexion" : "Créer un compte"}</h2>
        {mode === "inscription" && (
          <label>
            Nom
            <input value={form.name} onChange={changer("name")} required />
          </label>
        )}
        <label>
          E-mail
          <input type="email" value={form.email} onChange={changer("email")} required />
        </label>
        <label>
          Mot de passe
          <input type="password" value={form.password} onChange={changer("password")} required minLength={6} />
        </label>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <button className="bouton" disabled={chargement}>
          {chargement ? "Un instant..." : mode === "connexion" ? "Se connecter" : "S'inscrire"}
        </button>
        <button
          type="button"
          className="lien"
          onClick={() => {
            setErreur("");
            setMode(mode === "connexion" ? "inscription" : "connexion");
          }}
        >
          {mode === "connexion" ? "Pas de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </form>
    </main>
  );
}

function Programme({ programme, actions }) {
  return (
    <article className="carte programme">
      <header className="programme-tete">
        <div>
          <h3>{programme.destination}</h3>
          <p className="discret">
            {programme.nbJours} jour{programme.nbJours > 1 ? "s" : ""} · budget {programme.budget} TND ·
            niveau {programme.niveau}
          </p>
        </div>
        <div className="actions">{actions}</div>
      </header>

      <ol className="jours">
        {programme.jours.map((j) => (
          <li key={j.jour} className="jour">
            <div className="jour-num">J{j.jour}</div>
            <div className="jour-corps">
              <h4>{j.titre}</h4>
              <dl>
                <dt>Matin</dt>
                <dd>{j.matin}</dd>
                <dt>Après-midi</dt>
                <dd>{j.apresMidi}</dd>
                <dt>Soir</dt>
                <dd>{j.soir}</dd>
              </dl>
              <p className="cout">Coût estimé : {j.coutEstime} TND</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="bilan">
        <div>
          <span>Total estimé</span>
          <strong>{programme.totalEstime} TND</strong>
        </div>
        <div>
          <span>Reste sur le budget</span>
          <strong className={programme.resteBudget < 0 ? "negatif" : ""}>{programme.resteBudget} TND</strong>
        </div>
      </footer>
    </article>
  );
}

function Planifier({ token }) {
  const [form, setForm] = useState({ destination: "Tunis", days: 3, budget: 600 });
  const [programme, setProgramme] = useState(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);

  async function generer(e) {
    e.preventDefault();
    setErreur("");
    setMessage("");
    setSauvegarde(false);
    setChargement(true);
    try {
      setProgramme(await api.generer(token, form));
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function sauvegarder() {
    setErreur("");
    try {
      await api.sauvegarder(token, programme);
      setSauvegarde(true);
      setMessage("Programme sauvegardé dans « Mes programmes ».");
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="planifier">
      <form className="carte formulaire" onSubmit={generer}>
        <h2>Nouveau voyage</h2>
        <label>
          Destination
          <input
            list="destinations"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
          <datalist id="destinations">
            {DESTINATIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
        <label>
          Durée (jours)
          <input
            type="number"
            min="1"
            max="14"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
            required
          />
        </label>
        <label>
          Budget total (TND)
          <input
            type="number"
            min="20"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            required
          />
        </label>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <button className="bouton" disabled={chargement}>
          {chargement ? "Génération..." : "Générer mon programme"}
        </button>
      </form>

      <div className="resultat">
        {!programme && (
          <div className="vide">
            <p>Ton programme apparaîtra ici.</p>
            <p className="discret">Renseigne ta destination, ta durée et ton budget.</p>
          </div>
        )}
        {programme && (
          <>
            {message && <p className="succes" role="status">{message}</p>}
            <Programme
              programme={programme}
              actions={
                <button className="bouton" onClick={sauvegarder} disabled={sauvegarde}>
                  {sauvegarde ? "Sauvegardé" : "Sauvegarder"}
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function MesProgrammes({ token }) {
  const [liste, setListe] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [erreur, setErreur] = useState("");

  async function charger() {
    try {
      setListe(await api.lister(token));
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function voir(id) {
    setErreur("");
    try {
      const rep = await api.lire(token, id);
      setOuvert({ id, programme: rep.content });
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer(id) {
    if (!window.confirm("Supprimer ce programme ?")) return;
    setErreur("");
    try {
      await api.supprimer(token, id);
      if (ouvert && ouvert.id === id) setOuvert(null);
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (!liste) return <p className="discret">{erreur || "Chargement..."}</p>;

  return (
    <div className="mes-programmes">
      <section>
        <h2>Mes programmes</h2>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {liste.length === 0 && (
          <div className="vide">
            <p>Aucun programme sauvegardé pour le moment.</p>
            <p className="discret">Génère un voyage dans l'onglet « Planifier » puis sauvegarde-le.</p>
          </div>
        )}
        <ul className="liste">
          {liste.map((p) => (
            <li key={p.id} className={"carte ligne" + (ouvert && ouvert.id === p.id ? " actif" : "")}>
              <div>
                <strong>{p.destination}</strong>
                <p className="discret">
                  {p.nb_jours} jour{p.nb_jours > 1 ? "s" : ""} · {p.budget} TND · créé le {formaterDate(p.created_at)}
                </p>
              </div>
              <div className="actions">
                <button className="bouton secondaire" onClick={() => voir(p.id)}>Voir</button>
                <button className="bouton danger" onClick={() => supprimer(p.id)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {ouvert && <Programme programme={ouvert.programme} />}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(lireSession());
  const [onglet, setOnglet] = useState("planifier");

  function connecter(s) {
    ecrireSession(s);
    setSession(s);
  }

  function deconnecter() {
    ecrireSession(null);
    setSession(null);
    setOnglet("planifier");
  }

  if (!session) return <Auth onConnecte={connecter} />;

  return (
    <>
      <header className="entete">
        <span className="logo">TounesTrip</span>
        <nav>
          <button className={onglet === "planifier" ? "onglet actif" : "onglet"} onClick={() => setOnglet("planifier")}>
            Planifier
          </button>
          <button className={onglet === "programmes" ? "onglet actif" : "onglet"} onClick={() => setOnglet("programmes")}>
            Mes programmes
          </button>
        </nav>
        <div className="utilisateur">
          <span>{session.nom}</span>
          <button className="lien" onClick={deconnecter}>Déconnexion</button>
        </div>
      </header>
      <main className="page">
        {onglet === "planifier" ? <Planifier token={session.token} /> : <MesProgrammes token={session.token} />}
      </main>
    </>
  );
}
