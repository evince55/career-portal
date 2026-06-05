#!/bin/bash
# Cloudflare DNS Auto-Update Script
# Updates A record to match current public IP
# Run via cron: */30 * * * * /path/to/career-portal/scripts/cloudflare-dns-update.sh

set -e

# Configuration
ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
DOMAIN="chai-homelab.com"
RECORD="chai-homelab.com"
TTL=300  # 5 minutes

# Get current public IP
CURRENT_IP=$(curl -sL https://api.ipify.org)
echo "Current public IP: $CURRENT_IP"

# Get existing IP from Cloudflare
EXISTING_IP=$(curl -sLX GET \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$DOMAIN" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" | \
  jq -r '.result[0].content // empty')

echo "Existing DNS IP: ${EXISTING_IP:-'Not found'}"

# Update if different
if [ "$CURRENT_IP" != "$EXISTING_IP" ]; then
  echo "Updating DNS record..."
  
  RECORD_ID=$(curl -sLX GET \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$DOMAIN" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" | \
    jq -r '.result[0].id // empty')
  
  if [ -n "$RECORD_ID" ]; then
    curl -sLX PUT \
      "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$CURRENT_IP\",\"proxied\":true,\"ttl\":$TTL}" \
    && echo "DNS record updated successfully"
  else
    curl -sLX POST \
      "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$CURRENT_IP\",\"proxied\":true,\"ttl\":$TTL}" \
    && echo "DNS record created successfully"
  fi
else
  echo "IP unchanged, no update needed"
fi
