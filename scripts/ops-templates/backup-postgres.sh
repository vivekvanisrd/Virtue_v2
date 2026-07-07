#!/usr/bin/env bash
# PostgreSQL Daily Logical Backup script for Virtue ERP V2
# Place in /usr/local/bin/backup-postgres.sh and set cron job

set -o errexit
set -o pipefail
set -o nounset

# Load environment configuration variables
DB_HOST=${DATABASE_HOST:-"localhost"}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-"postgres"}
DB_USER=${DATABASE_USER:-"postgres"}
PGPASSWORD=${DATABASE_PASSWORD:-""}
export PGPASSWORD

BACKUP_DIR="/var/backups/virtue"
TIMESTAMP=$(date +%F_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/virtue_db_backup_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"
GPG_RECIPIENT_KEY="admin@virtue.school.edu"
MINIO_BUCKET="virtue-database-backups"

# Create local folder if not exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Initiating pg_dump logical extraction..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Fp | gzip > "${BACKUP_FILE}"

echo "[$(date)] Encrypting backup file using GPG..."
# Encrypt backup file symmetrically using password or asymmetric GPG public key
gpg --encrypt --recipient "${GPG_RECIPIENT_KEY}" --trust-model always --output "${ENCRYPTED_FILE}" "${BACKUP_FILE}"

echo "[$(date)] Uploading encrypted backup payload to MinIO..."
# Assume AWS CLI or MinIO Client (mc) is configured locally on the host
aws --endpoint-url https://minio.school.edu s3 cp "${ENCRYPTED_FILE}" "s3://${MINIO_BUCKET}/db/virtue_db_backup_${TIMESTAMP}.sql.gz.gpg"

echo "[$(date)] Cleaning up local raw backup file and encrypted artifacts..."
rm -f "${BACKUP_FILE}" "${ENCRYPTED_FILE}"

echo "[$(date)] Database backup pipeline executed successfully."
