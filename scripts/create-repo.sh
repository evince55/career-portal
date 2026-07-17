#!/bin/bash
# Create GitHub repository via API

GITHUB_USER="evince55"
REPO_NAME="career-portal"

echo "Creating GitHub repository: $GITHUB_USER/$REPO_NAME..."
echo ""
echo "If this fails, create it manually at:"
echo "https://github.com/new?username=$GITHUB_USER&repo_name=$REPO_NAME"
echo ""

# Try to create repo
curl -sX POST https://api.github.com/user/repos \
  -H "Accept: application/vnd.github.v3+json" \
  -u "$GITHUB_USER:" \
  -d "{\"name\":\"$REPO_NAME\",\"private\":false}" | python3 -m json.tool 2>/dev/null || echo "Check your GitHub credentials or create manually"
