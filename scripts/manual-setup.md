# Manual Setup Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `career-portal`
3. Visibility: Public
4. Click "Create repository"

OR use the API (requires GitHub PAT):
```bash
curl -X POST https://api.github.com/user/repos \
  -H "Accept: application/vnd.github.v3+json" \
  -u "evince55:YOUR_PAT_TOKEN" \
  -d '{"name":"career-portal","private":false}'
```

## Step 2: Push Local Code

```bash
cd /home/eugene/career-portal

# Add remote (if not already added)
git remote add origin https://github.com/evince55/career-portal.git

# Push code
git push -u origin master
```

## Step 3: Set Up Cloudflare DNS

1. Go to https://dash.cloudflare.com
2. Add domain: `chai-homelab.com` (if not already added)
3. Get Zone ID from dashboard
4. Create API Token:
   - Template: Zone
   - Permissions: Zone Read, DNS Edit
   - Scope: zone.* for chai-homelab.com
5. Copy Zone ID and API Token

Set environment variables:
```bash
export CLOUDFLARE_API_TOKEN='your_token'
export CLOUDFLARE_ZONE_ID='your_zone_id'
```

## Step 4: Deploy Static Site

```bash
# Build the site
npm run build

# Upload to Azure Blob
./scripts/deploy-azure.sh
```

## Step 5: Set Up Dynamic DNS Cron Job

```bash
crontab -e
# Add this line (updates IP every 30 minutes):
*/30 * * * * /home/eugene/career-portal/scripts/cloudflare-dns-update.sh
```

## Step 6: Configure GitHub Actions Secrets

In your GitHub repo settings > Secrets:
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Blob connection string
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `GITHUB_PAT`: GitHub personal access token (optional)

## Step 7: Verify Deployment

Visit https://chai-homelab.com to see your terminal portfolio!
