#!/bin/bash
# Démo de la boucle complète : modifier -> push -> Pull Request -> CI -> déployer -> vérifier
set -e

REPO_URL="https://github.com/eyaajribi-ship-it/devops-demo"
COMPOSE="docker-compose.prod.yml"

echo "1. Modification du code..."
# Bascule la réponse de /health entre "healthy" et "ok" pour avoir un diff visible
if grep -q '"healthy"' backend/src/app.js; then
  sed -i 's/status: "healthy"/status: "ok"/' backend/src/app.js
else
  sed -i 's/status: "ok"/status: "healthy"/' backend/src/app.js
fi
git diff --stat

echo "2. Commit et push..."
BRANCH="demo-$(date +%s)"
git checkout -b "$BRANCH"
git add backend/src/app.js
git commit -m "demo: update health"
git push origin HEAD

echo "3. Ouvrir une Pull Request à l'adresse :"
echo "   $REPO_URL/pull/new/$BRANCH"
echo "   Fusionner la PR dans main, puis attendre le run vert dans l'onglet Actions :"
echo "   $REPO_URL/actions"
read -p "Appuyer sur Entrée quand le pipeline est vert... " _

echo "4. Déploiement de la dernière image..."
docker compose -f "$COMPOSE" pull app
docker compose -f "$COMPOSE" up -d

echo "5. Vérification..."
sleep 8
curl http://localhost:3000/health
echo
echo "Supervision : http://localhost:3001"
