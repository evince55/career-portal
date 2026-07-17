#!/bin/bash
# Push career-portal code to GitHub after manual repo creation

set -e

REPO_URL="https://github.com/evince55/career-portal.git"

echo "🚀 Pushing to GitHub..."
git remote set-url origin "$REPO_URL"
git push -u origin master

echo "✅ Successfully pushed to GitHub!"
echo "🌐 View at: https://github.com/evince55/career-portal"
