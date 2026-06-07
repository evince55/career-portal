#!/usr/bin/env bash
# Deploy career-portal to Azure + configure all cloud services
# Usage: ./scripts/deploy.sh [--azure] [--cloudflare] [--functions] [--all]
set -euo pipefail

PORTAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PORTAL_DIR/../dist"
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-chaihomelab}"
AZURE_STORAGE_CONTAINER="\$web"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-chai-homelab}"
REGION="${REGION:-eastus}"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*"; exit 1; }

check_cmd() { command -v "$1" &>/dev/null || err "Missing: $1 (install it first)"; }

# ── Step 0: Validate environment ─────────────────────────────────────────────
log "Validating environment..."
check_cmd node
check_cmd npm

if [[ ! -d "$DIST_DIR" ]]; then
  warn "dist/ not found — running build first..."
  cd "$PORTAL_DIR" && npm run build || err "Build failed"
fi

# ── Step 1: Deploy static site to Azure Blob Storage ─────────────────────────
deploy_static() {
  log "Deploying static site to Azure Blob Storage..."
  check_cmd az

  log "  Logging into Azure..."
  az account show &>/dev/null || az login --use-device-code 2>/dev/null || err "Azure login failed"

  log "  Selecting subscription: $AZURE_SUBSCRIPTION_ID"
  az account set --subscription "$AZURE_SUBSCRIPTION_ID" 2>/dev/null || true

  # Ensure storage account exists
  if ! az storage account show --name "$AZURE_STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &>/dev/null 2>&1; then
    log "  Creating storage account: $AZURE_STORAGE_ACCOUNT"
    az storage account create \
      --name "$AZURE_STORAGE_ACCOUNT" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$REGION" \
      --sku Standard_LRS \
      --kind BlobStorage \
      --access-tier Cool 2>/dev/null || true
  fi

  # Get storage key and upload
  STORAGE_KEY=$(az storage account keys list --name "$AZURE_STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" -o tsv --query "[0].value")

  log "  Uploading dist/ to $AZURE_STORAGE_CONTAINER container..."
  az storage blob upload-batch \
    --source "$DIST_DIR" \
    --destination "$AZURE_STORAGE_CONTAINER" \
    --account-name "$AZURE_STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --overwrite true

  # Set static website index page
  log "  Configuring static website..."
  az storage blob service-properties update \
    --account-name "$AZURE_STORAGE_ACCOUNT" \
    --web-index-page index.html \
    --error-page error.html 2>/dev/null || warn "Static website config skipped (may already be set)"

  # Set security headers via web.config for Azure Static Website
  log "  Configuring security headers (CSP, CORS, caching)..."
  cat > "$DIST_DIR/web.config" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <httpHeaders>
      <clear />
      <add key="Content-Security-Policy" value="default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.azurewe.net;" />
      <add key="X-Frame-Options" value="deny" />
      <add key="X-XSSR-Policy" value="strict" />
      <add key="Cache-Control" value="max-age=31536000;immutable" />
    </httpHeaders>
  </system.webServer>
</configuration>
EOF

  # Set CORS for GitHub Actions
  log "  Configuring CORS..."
  az storage account blob-cors add \
    --account-name "$AZURE_STORAGE_ACCOUNT" \
    --allowed-origin "https://github.com" \
    --allowed-origin "https://*.github.io" 2>/dev/null || warn "CORS config skipped"

  log "  Static site deployed at: https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/\$web/index.html"
  log "  (After DNS is configured, it will be available at https://chai-homelab.com)"
}

# ── Step 2: Deploy Azure Functions ────────────────────────────────────────────
deploy_functions() {
  log "Deploying Azure Functions..."
  check_cmd func

  for func_dir in portfolio-metrics portfolio-agent; do
    if [[ -d "$PORTAL_DIR/azure-functions/$func_dir" ]]; then
      log "  Deploying $func_dir..."
      cd "$PORTAL_DIR/azure-functions/$func_dir" || continue
      func deploy --force 2>/dev/null || warn "  $func_dir deployment failed (set FUNC_APP_NAME env var)"
    fi
  done
}

# ── Step 3: Configure Cloudflare DNS ─────────────────────────────────────────
configure_cloudflare() {
  log "Configuring Cloudflare DNS..."
  check_cmd cf

  # Verify API token is set
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    warn "Set CLOUDFLARE_API_TOKEN environment variable for automated DNS updates"
    log "  Manual setup:"
    log "    1. Go to https://dash.cloudflare.com/profile/api-tokens"
    log "    2. Create token with: Zone > DNS > Edit + Zone > Zone > Read"
    log "    3. Set: export CLOUDFLARE_API_TOKEN='your-token-here'"
    return 0
  fi

  # Get current public IP
  CURRENT_IP=$(curl -s --max-time 10 https://api.cloudflare.com/cdn-cgi/geoip)
  log "  Current public IP: $CURRENT_IP"

  # Update A record for root domain
  cf record update "$CLOUDFLARE_API_TOKEN" "chai-homelab.com" A "$CURRENT_IP" || warn "DNS update failed"
  log "  DNS updated: chai-homelab.com -> $CURRENT_IP"

  # Update wildcard subdomain
  cf record update "$CLOUDFLARE_API_TOKEN" "*.chai-homelab.com" CNAME "cname.cloudflare.com" || true
}

# ── Step 4: Verify deployment ────────────────────────────────────────────────
verify() {
  log "Verifying deployment..."

  # Check dist/ contents
  local file_count=$(find "$DIST_DIR" -type f | wc -l)
  local total_size=$(du -sh "$DIST_DIR" | cut -f1)
  log "  Files in dist/: $file_count"
  log "  Total size: $total_size"

  # Check key files exist
  for f in index.html manifest.json offline.html; do
    if [[ -f "$DIST_DIR/$f" ]]; then
      log "  ✓ $f present"
    else
      warn "  ✗ $f missing from dist/"
    fi
  done

  # Check Azure connectivity
  if command -v az &>/dev/null; then
    local sub=$(az account show --query 'user.name' -o tsv 2>/dev/null || echo "not logged in")
    log "  Azure: $sub"
  fi

  log "Deployment complete!"
}

# ── Main ─────────────────────────────────────────────────────────────────────
DEPLOY_STATIC=true
DEPLOY_FUNCTIONS=false
DEPLOY_CLOUDFLARE=false

for arg in "$@"; do
  case "$arg" in
    --all)     DEPLOY_STATIC=true; DEPLOY_FUNCTIONS=true; DEPLOY_CLOUDFLARE=true ;;
    --azure)   DEPLOY_STATIC=true; DEPLOY_FUNCTIONS=true ;;
    --functions) DEPLOY_FUNCTIONS=true ;;
    --cloudflare) DEPLOY_CLOUDFLARE=true ;;
    --help|-h)
      echo "Usage: $0 [--all|--azure|--functions|--cloudflare]"
      echo ""
      echo "Required environment variables:"
      echo "  AZURE_STORAGE_ACCOUNT   - Azure Blob Storage account name (default: chaihomelab)"
      echo "  RESOURCE_GROUP          - Azure resource group (default: rg-chai-homelab)"
      echo "  CLOUDFLARE_API_TOKEN    - Cloudflare API token for DNS updates"
      exit 0
      ;;
  esac
done

log "Starting deployment..."
log "  Portal: $PORTAL_DIR"
log "  Dist:   $DIST_DIR"
echo ""

$DEPLOY_STATIC && deploy_static
$DEPLOY_FUNCTIONS && deploy_functions
$DEPLOY_CLOUDFLARE && configure_cloudflare

echo ""
verify
