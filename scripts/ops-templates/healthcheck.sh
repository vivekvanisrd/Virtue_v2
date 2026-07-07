#!/usr/bin/env bash
# Local Container Health Check script for Virtue ERP V2
# Place in /usr/local/bin/healthcheck.sh and set monitoring trigger

set -o pipefail

APP_URL=${VIRTUE_HEALTH_URL:-"http://localhost:3000/api/system/transport-health"}
ALERT_WEBHOOK=${SLACK_OPS_WEBHOOK:-""}
MAX_RETRIES=3
TIMEOUT_SEC=5

echo "[$(date)] Running health check against: ${APP_URL}..."

for ((i=1; i<=MAX_RETRIES; i++)); do
    response=$(curl --silent --show-error --max-time ${TIMEOUT_SEC} --write-out "%{http_code}" "${APP_URL}" || echo "FAILED")
    http_code="${response: -3}"
    body="${response:0:${#response}-3}"
    
    if [ "$http_code" -eq 200 ]; then
        echo "[$(date)] Health Check: SUCCESS (HTTP 200 OK)."
        exit 0
    else
        echo "[$(date)] Health Check attempt $i/$MAX_RETRIES failed (HTTP: ${http_code})."
        sleep 2
    fi
done

echo "[$(date)] Health Check: FAILURE. Web Server is unresponsive."

if [ -n "${ALERT_WEBHOOK}" ]; then
    curl -X POST -H 'Content-type: application/json' \
         --data "{\"text\":\"🚨 *Virtue ERP Health Alert* : Application server at ${APP_URL} is UNRESPONSIVE (HTTP ${http_code})!\"}" \
         "${ALERT_WEBHOOK}"
fi

exit 1
