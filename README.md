# TounesTrip

Application web qui génère un **programme de voyage en Tunisie, jour par jour**, à partir d'une destination, d'une durée et d'un budget. Le projet est livré avec une chaîne CI/CD complète : tests, image Docker, registre, déploiement automatisé et supervision.

## À quoi sert l'application

Préparer un voyage prend du temps : que visiter, dans quel ordre, pour quel coût ? TounesTrip répond à cette question en quelques secondes. L'utilisateur indique où il va, combien de jours et son budget. L'application propose pour chaque jour une activité le matin, une l'après-midi et un restaurant le soir, avec le coût estimé et ce qu'il reste du budget.

## Fonctionnalités

1. **Inscription et connexion** : compte personnel, mot de passe chiffré, session par jeton JWT.
2. **Saisie du voyage** : destination, durée (1 à 14 jours) et budget en dinars.
3. **Génération du programme** : programme jour par jour (matin, après-midi, soir), coût estimé par jour, total et reste du budget.
4. **Sauvegarde et consultation** : les programmes sont enregistrés dans « Mes programmes ».
5. **Suppression** d'un programme.

Destinations connues : Tunis, Sidi Bou Saïd, Hammamet, Sousse, Djerba, Tozeur. Pour toute autre destination, l'application génère un programme générique. Le budget fait varier les choix : un petit budget passe en premier les activités gratuites ou peu chères, un budget confortable ou premium les activités payantes.

## Comment ça fonctionne

```
Navigateur (React)  ──►  API Express (Node.js)  ──►  PostgreSQL
   formulaire               /api/auth/*               users
   programme                /api/programs/*           programs
                            /health  (supervision)
```

- **Front-end** : React (Vite). Il est compilé puis servi par l'API : une seule image Docker contient tout.
- **Back-end** : Node.js et Express. Le générateur (`backend/src/generator.js`) est volontairement simulé : à partir de données prêtes par destination, il produit toujours le même programme pour les mêmes entrées, sans API externe.
- **Base de données** : PostgreSQL, deux tables (`users`, `programs`). Le programme généré est stocké en JSON.

### API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | Supervision (`{"status":"healthy"}`) |
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Se connecter |
| POST | `/api/programs/generate` | Générer un programme (sans l'enregistrer) |
| POST | `/api/programs` | Sauvegarder un programme |
| GET | `/api/programs` | Lister ses programmes |
| GET | `/api/programs/:id` | Consulter un programme |
| DELETE | `/api/programs/:id` | Supprimer un programme |

## Architecture DevOps

- **GitHub** : code source, branches `feature/*`, Pull Requests, branche `main` protégée
- **GitHub Actions** : tests du back-end, compilation du front-end, construction de l'image Docker
- **GHCR (GitHub Container Registry)** : registre d'images (`ghcr.io/eyaajribi-ship-it/tounestrip`)
- **Docker et Docker Compose** : conteneurisation de l'application et de PostgreSQL
- **pyinfra** : déploiement automatisé (`deploy.py`)
- **Uptime Kuma** : supervision de la route `/health`

### Flux du pipeline

1. Le développeur pousse sur une branche `feature/*`
2. La Pull Request exécute les tests et le build
3. La fusion dans `main` construit l'image et la pousse sur GHCR (tag SHA + `latest`)
4. `deploy.py` (pyinfra) récupère la nouvelle image et redémarre les conteneurs
5. Uptime Kuma sonde `/health` toutes les 60 secondes

## Comment exécuter

### Avec Docker Compose (recommandé)

```bash
docker compose up -d --build
curl http://localhost:3000/health
```

Ouvrir ensuite http://localhost:3000. Pour tout arrêter : `docker compose down`.

### En développement (sans Docker pour l'application)

```bash
# 1. une base PostgreSQL
docker run -d --name tt-db -p 5432:5432 -e POSTGRES_USER=tounestrip \
  -e POSTGRES_PASSWORD=tounestrip -e POSTGRES_DB=tounestrip postgres:16-alpine

# 2. le back-end (port 3000)
cd backend && npm install && npm start

# 3. le front-end (port 5173, relié au back-end)
cd frontend && npm install && npm run dev
```

### Tests

```bash
cd backend && npm test
```

Les tests couvrent le générateur et toute l'API (inscription, connexion, génération, sauvegarde, suppression) avec une base en mémoire : ils n'ont pas besoin de PostgreSQL.

## Déployer

Après un run vert sur `main`, la dernière image est disponible sur GHCR. Pour la déployer depuis une machine Linux :

```bash
pip install pyinfra
pyinfra @local deploy.py --sudo
```

Sans pyinfra, les mêmes opérations s'exécutent à la main :

```bash
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
```

Pensez à définir `JWT_SECRET` (variable d'environnement) avec une valeur secrète en dehors d'un environnement de démonstration.

## Supervision

```bash
docker run -d --name uptime-kuma --restart unless-stopped -p 3001:3001 -v uptime-kuma-data:/app/data louislam/uptime-kuma:1
```

Ouvrir http://localhost:3001, créer le compte administrateur, puis ajouter une sonde HTTP(s) :

- URL : `http://host.docker.internal:3000/health`
- Intervalle : 60 secondes, 2 essais

## Démo en 30 secondes

```bash
bash demo.sh
```

Le script modifie la réponse de `/health`, pousse une branche, affiche le lien de la Pull Request, puis (une fois la PR fusionnée et le pipeline vert) déploie la nouvelle image et vérifie la réponse.
