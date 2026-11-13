# deploy.py
from pyinfra.operations import apt, server

# 1. Installer Docker s'il est absent
apt.packages(
    name="Installer Docker",
    packages=["docker.io"],
    update=True,
)

# 2. Récupérer la dernière image depuis GitHub Container Registry (ghcr.io)
server.shell(
    name="Pull de la dernière image depuis GHCR",
    commands=[
        "docker pull ghcr.io/eyaajribi-ship-it/devops-demo:latest",
    ],
)

# 3. Arrêter l'ancien conteneur (s'il existe)
server.shell(
    name="Arrêter l'ancien conteneur",
    commands=[
        "docker stop devops-app || true",
        "docker rm devops-app || true",
    ],
)

# 4. Démarrer le nouveau conteneur avec l'image GHCR
server.shell(
    name="Démarrer le nouveau conteneur",
    commands=[
        "docker run -d --name devops-app -p 3000:3000 ghcr.io/eyaajribi-ship-it/devops-demo:latest"
    ],
)
