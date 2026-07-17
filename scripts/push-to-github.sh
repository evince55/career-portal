#!/bin/bash
# Push to GitHub via HTTPS with credentials

set -e

REPO_URL="https://github.com/evince55/career-portal.git"

echo "Pushing to GitHub..."
echo ""

# Try with GITHUB_PAT environment variable
if [ -n "$GITHUB_PAT" ]; then
  echo "Using GITHUB_PAT environment variable..."
  git push -u origin master
else
  echo "GITHUB_PAT not set, using SSH or prompting for credentials"
  
  # Try SSH first
  if git remote get-url origin 2>/dev/null | grep -q "git@github.com"; then
    echo "Using SSH remote..."
    git push -u origin master
  else
    echo "Switching to HTTPS remote..."
    git remote set-url origin https://github.com/evince55/career-portal.git
    git push -u origin master
  fi
fi

echo ""
echo "Repository ready at: https://github.com/evince55/career-portal"
