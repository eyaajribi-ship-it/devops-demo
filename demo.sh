#!/bin/bash
# Démo de la boucle complète : modifier -> push -> PR -> CI -> déployer -> vérifier
set -e

REPO_URL="https://github.com/eyaajribi-ship-it/devops-demo"
IMAGE="ghcr.io/eyaajribi-ship-it/devops-demo:latest"

echo "1. Modification du code..."
# Bascule la réponse de /health entre "healthy" et "ok" pour que le diff soit toujours visible
if grep -q '"healthy"' app.py; then
  sed -i 's/"healthy"/"ok"/' app.py
else
  sed -i 's/"ok"/"healthy"/' app.py
fi
git diff --stat

echo "2. Commit et push..."
BRANCH="demo-$(date +%s)"
git checkout -b "$BRANCH"
git add app.py
git commit -m "demo: update health"
git push origin HEAD

echo "3. Ouvrir une Pull Request à l'adresse :"
echo "   $REPO_URL/pull/new/$BRANCH"
echo "   Fusionner la PR dans main, puis attendre le run vert dans l'onglet Actions :"
echo "   $REPO_URL/actions"
read -p "Appuyer sur Entrée quand le pipeline est vert... " _

echo "4. Déploiement de la dernière image..."
docker pull "$IMAGE"
docker stop devops-app || true
docker rm devops-app || true
docker run -d --name devops-app -p 3000:3000 --restart unless-stopped "$IMAGE"

echo "5. Vérification..."
sleep 5
curl http://localhost:3000/health
echo
echo "Supervision : http://localhost:3001"
