# Projet DevOps Demo

Chaîne CI/CD conteneurisée d'une application web de programmes de voyage (TounesTrip).
L'application expose une route `/health` qui est supervisée en continu.

## Architecture

- **GitHub** : gestion du code source (branches `feature/*`, Pull Requests, branche `main`)
- **GitHub Actions** : exécute les tests et le build à chaque push (job `test-and-build`)
- **GHCR (GitHub Container Registry)** : registre d'images Docker (`ghcr.io/eyaajribi-ship-it/devops-demo`)
- **Docker** : conteneurisation de l'application Flask (port 3000)
- **pyinfra** : script de déploiement automatisé (`deploy.py`)
- **Uptime Kuma** : supervision de disponibilité de la route `/health`

## Flux du pipeline

1. Le développeur pousse sur une branche `feature/*`
2. La Pull Request exécute les tests de la CI
3. La fusion dans `main` construit l'image et la pousse sur GHCR (tag SHA + `latest`)
4. `deploy.py` (pyinfra) récupère la nouvelle image et redémarre le conteneur
5. Uptime Kuma sonde `/health` toutes les 60 secondes

## Comment exécuter

Lancer l'application en local :

```bash
docker build -t devops-demo:latest .
docker run -d --name devops-app -p 3000:3000 --restart unless-stopped devops-demo:latest
curl http://localhost:3000/health
```

Déployer la dernière image publiée sur GHCR :

```bash
docker pull ghcr.io/eyaajribi-ship-it/devops-demo:latest
docker stop devops-app || true
docker rm devops-app || true
docker run -d --name devops-app -p 3000:3000 --restart unless-stopped ghcr.io/eyaajribi-ship-it/devops-demo:latest
```

Ou avec pyinfra, depuis une machine Linux :

```bash
pip install pyinfra
pyinfra @local deploy.py --sudo
```

Lancer la supervision :

```bash
docker run -d --name uptime-kuma --restart unless-stopped -p 3001:3001 -v uptime-kuma-data:/app/data louislam/uptime-kuma:1
```

Puis ouvrir `http://localhost:3001` et ajouter une sonde HTTP(s) sur
`http://host.docker.internal:3000/health` (intervalle 60 s, 2 essais).

## Démo en 30 secondes

```bash
bash demo.sh
```
