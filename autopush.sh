#!/bin/bash
# autopush.sh - Automatically stage, commit with a timestamp, and push to GitHub

# Stage all changes
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit."
else
    # Commit with a timestamp
    git commit -m "Auto-commit: $(date +'%Y-%m-%d %H:%M:%S')"
    
    # Push to origin main
    git push origin main
fi
