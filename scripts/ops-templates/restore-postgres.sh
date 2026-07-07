#!/usr/bin/env bash
# PostgreSQL Backup Restoration script for Virtue ERP V2
# Place in /usr/local/bin/restore-postgres.sh

set -o errexit
set -o nounset

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <s3_backup_filename>"
    echo "Example: $0 virtue_db_backup_2026-06-30_10-00-00.sql.gz.gpg"
    exit 1
fi

BACKUP_FILENAME=$1
MINIO_BUCKET="virtue-database-backups"
RESTORE_DIR="/tmp/restore_virtue"
DOWNLOADED_PATH="${RESTORE_DIR}/${BACKUP_FILENAME}"
DECRYPTED_PATH="${DOWNLOADED_PATH%.gpg}"

DB_HOST=${DATABASE_HOST:-"localhost"}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-"postgres"}
DB_USER=${DATABASE_USER:-"postgres"}
PGPASSWORD=${DATABASE_PASSWORD:-""}
export PGPASSWORD

mkdir -p "${RESTORE_DIR}"

echo "[$(date)] Downloading backup archive from MinIO..."
aws --endpoint-url https://minio.school.edu s3 cp "s3://${MINIO_BUCKET}/db/${BACKUP_FILENAME}" "${DOWNLOADED_PATH}"

echo "[$(date)] Decrypting backup file using private GPG key..."
gpg --decrypt --output "${DECRYPTED_PATH}" "${DOWNLOADED_PATH}"

echo "[$(date)] Terminating active connections to target database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

echo "[$(date)] Recreating database schema context..."
dropdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" --if-exists "${DB_NAME}"
createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"

echo "[$(date)] Importing database records..."
gunzip -c "${DECRYPTED_PATH}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date)] Cleaning up temporary decrypted files..."
rm -rf "${RESTORE_DIR}"

echo "[$(date)] Database restoration sequence completed successfully."
