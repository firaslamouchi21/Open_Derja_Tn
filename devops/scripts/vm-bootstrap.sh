#!/usr/bin/env bash
set -euo pipefail

: "${REPO_URL:?REPO_URL is required, e.g. git@github.com:firas-lmch/open_derja_tn.git}"
: "${APP_DIR:=/opt/opendarja}"

if [ "$(id -u)" -ne 0 ]; then
  echo "vm-bootstrap.sh: run as root" >&2
  exit 1
fi

echo "==> installing base packages"
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git jq unattended-upgrades

echo "==> enabling unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades

if ! command -v docker >/dev/null 2>&1; then
  echo "==> installing Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  arch="$(dpkg --print-architecture)"
  codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=$arch signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $codename stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

systemctl enable --now docker

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> cloning repo into $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> repo already present at $APP_DIR"
fi

if [ ! -f "$APP_DIR/devops/compose/.env.prod" ]; then
  cp "$APP_DIR/devops/compose/.env.prod.example" "$APP_DIR/devops/compose/.env.prod"
  echo "==> wrote devops/compose/.env.prod from the example — fill in real secrets before deploying"
fi

cron_line="0 3 * * * cd $APP_DIR && devops/backup/pg-backup.sh >> /var/log/opendarja-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -vF "pg-backup.sh"; echo "$cron_line") | crontab -
echo "==> nightly backup cron installed (03:00 UTC)"

echo "==> done. Next steps:"
echo "    1. fill in $APP_DIR/devops/compose/.env.prod"
echo "    2. run: cd $APP_DIR && devops/scripts/deploy.sh devops/compose/.env.prod"
