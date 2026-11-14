# Déploiement automatisé avec pyinfra :
#   pyinfra @local deploy.py --sudo
# Il met à jour l'application TounesTrip avec la dernière image publiée sur GHCR.
from pyinfra.operations import apt, files, server

# 1. Installer Docker s'il est absent
apt.packages(
    name="Installer Docker et Docker Compose",
    packages=["docker.io", "docker-compose-v2"],
    update=True,
)

# 2. Déposer le fichier Compose de production
files.put(
    name="Copier docker-compose.prod.yml",
    src="docker-compose.prod.yml",
    dest="/opt/tounestrip/docker-compose.prod.yml",
    create_remote_dir=True,
)

# 3. Récupérer la dernière image depuis GHCR
server.shell(
    name="Pull de la dernière image depuis GHCR",
    commands=[
        "docker compose -f /opt/tounestrip/docker-compose.prod.yml pull app",
    ],
)

# 4. Redémarrer l'application avec la nouvelle image
server.shell(
    name="Redémarrer l'application",
    commands=[
        "docker compose -f /opt/tounestrip/docker-compose.prod.yml up -d",
    ],
)
