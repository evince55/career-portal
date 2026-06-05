#!/bin/bash
# Deploy to Azure Blob Storage
# Run after: npm run build

set -e

STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-chaihomelab}"
CONTAINER="\$web"
RESOURCE_GROUP="career-portal-rg"

echo "Deploying to Azure Blob Storage..."
echo "Storage Account: $STORAGE_ACCOUNT"
echo "Container: $CONTAINER"
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
  echo "Error: dist/ folder not found. Run 'npm run build' first."
  exit 1
fi

# Login to Azure (uncomment if using Azure CLI)
# az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID

# Upload to blob storage
az storage blob upload-batch \
  --source dist \
  --destination $CONTAINER \
  --account-name $STORAGE_ACCOUNT \
  --account-key ${AZURE_STORAGE_KEY:?AZURE_STORAGE_KEY required} \
  --overwrite

echo "Deployment complete!"
echo "URL: https://${STORAGE_ACCOUNT}.blob.core.windows.net/\$web"
