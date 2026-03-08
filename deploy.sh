#!/bin/bash
# ============================================
# Svatba Wedding Website - Deployment Script
# ============================================
# This script builds the production version and 
# deploys it to the gh-pages branch on GitHub.
#
# Usage: ./deploy.sh [commit message]
# ============================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting deployment...${NC}"

# Get the script directory (should be svatba3d)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Run this script from the svatba3d directory.${NC}"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "📍 Current branch: ${CURRENT_BRANCH}"

# Commit message (default or from argument)
COMMIT_MSG="${1:-Deploy: $(date '+%Y-%m-%d %H:%M')}"

# ============================================
# Step 1: Build the production bundle
# ============================================
echo -e "\n${YELLOW}📦 Building production bundle...${NC}"
npm run build

if [ ! -f "dist/presentation.bundle.js" ]; then
    echo -e "${RED}❌ Build failed: dist/presentation.bundle.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build complete${NC}"

# ============================================
# Step 2: Prepare deployment files
# ============================================
echo -e "\n${YELLOW}📁 Preparing deployment files...${NC}"

# Create temp directory for gh-pages content
TEMP_DIR=$(mktemp -d)
echo "📂 Using temp directory: $TEMP_DIR"

# Copy built files
cp dist/presentation.bundle.js "$TEMP_DIR/"
cp map.html "$TEMP_DIR/"
cp scenes.json "$TEMP_DIR/"
cp -r css "$TEMP_DIR/"
cp -r models "$TEMP_DIR/"

# Create the production index.html
cat > "$TEMP_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tomáš & Eliška - Svatba 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/presentation.css">
</head>
<body>
    <div id="loading">
        <div class="loader"></div>
        <p style="margin-top: 20px; color: rgba(245, 240, 232, 0.7);">Načítám...</p>
    </div>

    <div class="container">
        <div class="scene-container">
            <div id="canvas-container"></div>
        </div>
        <div class="content-container" id="contentContainer"></div>
    </div>

    <div class="progress-dots" id="progressDots"></div>

    <script type="module" src="presentation.bundle.js"></script>
</body>
</html>
EOF

echo -e "${GREEN}✅ Files prepared${NC}"

# ============================================
# Step 3: Deploy to gh-pages branch
# ============================================
echo -e "\n${YELLOW}🌐 Deploying to gh-pages branch...${NC}"

# Stash any uncommitted changes on current branch
git stash --quiet 2>/dev/null || true

# Switch to gh-pages branch
git checkout gh-pages

# Remove old files (except .git)
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} \;

# Copy new files
cp -r "$TEMP_DIR"/* .

# Remove temp directory
rm -rf "$TEMP_DIR"

# Remove .DS_Store files
find . -name ".DS_Store" -delete

# Commit and push
git add .
git commit -m "$COMMIT_MSG" || echo "No changes to commit"
git push origin gh-pages

echo -e "${GREEN}✅ Deployed to gh-pages${NC}"

# ============================================
# Step 4: Return to original branch
# ============================================
echo -e "\n${YELLOW}🔙 Returning to ${CURRENT_BRANCH}...${NC}"
git checkout "$CURRENT_BRANCH"
git stash pop --quiet 2>/dev/null || true

echo -e "\n${GREEN}✨ Deployment complete!${NC}"
echo -e "🌍 Your site will be available at: https://tomikrys.github.io/svatba/"