#!/bin/sh
# Daily dump of the Umami database, e.g. from cron: 0 4 * * * /opt/umami/backup.sh
set -eu
cd "$(dirname "$0")"
mkdir -p backups
docker compose exec -T db pg_dump -U umami umami | gzip > "backups/umami-$(date +%F).sql.gz"
find backups -name 'umami-*.sql.gz' -mtime +30 -delete
