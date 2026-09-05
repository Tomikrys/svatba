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
cp scenes.json "$TEMP_DIR/"
cp content.json "$TEMP_DIR/"
cp -r css "$TEMP_DIR/"

# Custom domain: GitHub Pages needs CNAME in the published root, or
# the site reverts to tomikrys.github.io/svatba/ on every deploy.
echo "bude.church" > "$TEMP_DIR/CNAME"

# "Aj na veselku" variant page (guests invited to both ceremony and party).
# The source file is the dev version: it loads unbundled ../js/presentation.js
# and declares a Three.js importmap. Neither belongs in production — the built
# bundle has Three.js inlined, and the importmap breaks iOS Safari < 16.4
# (unsupported <script type="importmap"> aborts the following module script).
# Strip the importmap block and repoint the module script at the bundle.
mkdir -p "$TEMP_DIR/aj-veselka"
sed -e '/<script type="importmap">/,/<\/script>/d' \
    -e '/<!-- Import Maps/d' \
    -e 's#\.\./js/presentation\.js#../presentation.bundle.js#' \
    aj-veselka/index.html > "$TEMP_DIR/aj-veselka/index.html"

# Copy models but exclude uncompressed folder (too big for GitHub)
mkdir -p "$TEMP_DIR/models"
cp models/*.glb "$TEMP_DIR/models/" 2>/dev/null || true
cp models/*.json "$TEMP_DIR/models/" 2>/dev/null || true

# Create the production index.html
cat > "$TEMP_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tomáš & Eliška - Svatba 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="css/presentation.css">
</head>
<body>
    <div class="container">
        <div class="scene-container">
            <div id="canvas-container"></div>
            <!-- Loading indicator inside 3D scene only -->
            <div id="sceneLoading" class="scene-loading">
                <div class="loader"></div>
                <p>Načítám 3D...</p>
            </div>
        </div>
        <div class="content-container" id="contentContainer"></div>
    </div>

    <div class="progress-dots" id="progressDots"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script type="module" src="presentation.bundle.js"></script>
</body>
</html>
EOF

echo -e "${GREEN}✅ Files prepared${NC}"

# ============================================
# Step 3: Deploy to gh-pages branch
# ============================================
echo -e "\n${YELLOW}🌐 Deploying to gh-pages branch...${NC}"

# Stash any uncommitted changes on current branch so a mid-run failure can't
# strand us on gh-pages with the wrong working tree. We restore in the trap.
STASH_CREATED=0
if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git stash push --include-untracked --quiet -m "deploy.sh auto-stash" && STASH_CREATED=1
fi

# Cleanup trap: whatever happens next (push failure, network glitch, ctrl-c),
# get the user back to their original branch with their working tree restored.
cleanup() {
    local exit_code=$?
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
    # If we're not on the original branch, hop back.
    local now_branch
    now_branch=$(git branch --show-current 2>/dev/null || echo "")
    if [ "$now_branch" != "$CURRENT_BRANCH" ]; then
        echo -e "${YELLOW}↩️  Returning to ${CURRENT_BRANCH}...${NC}"
        git checkout --quiet "$CURRENT_BRANCH" 2>/dev/null || \
            git checkout --force --quiet "$CURRENT_BRANCH" 2>/dev/null || true
    fi
    # Restore stashed changes if we created a stash.
    if [ "$STASH_CREATED" = "1" ]; then
        git stash pop --quiet 2>/dev/null || echo -e "${YELLOW}⚠️  Could not auto-pop stash — run 'git stash pop' manually.${NC}"
    fi
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}❌ Deploy failed (exit $exit_code).${NC}"
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

# Fetch remote gh-pages so we deploy on top of the latest published state.
# Without this, a local gh-pages branch that lagged behind origin would push
# a diverged history and reject.
git fetch --quiet origin gh-pages 2>/dev/null || true

# Check out gh-pages, forcing it to match origin so we never carry stale local commits.
if git show-ref --verify --quiet refs/remotes/origin/gh-pages 2>/dev/null; then
    if git show-ref --verify --quiet refs/heads/gh-pages 2>/dev/null; then
        echo "📌 Resetting local gh-pages to origin/gh-pages"
        git checkout gh-pages
        git reset --hard origin/gh-pages
    else
        echo "📌 Checking out gh-pages from remote"
        git checkout -b gh-pages origin/gh-pages
    fi
elif git show-ref --verify --quiet refs/heads/gh-pages 2>/dev/null; then
    echo "📌 Switching to existing local gh-pages branch"
    git checkout gh-pages
else
    echo "📌 Creating new orphan gh-pages branch"
    git checkout --orphan gh-pages
    git rm -rf . 2>/dev/null || true
fi

# Remove old files (except .git)
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} \;

# Copy new files
cp -r "$TEMP_DIR"/* .

# Remove .DS_Store files
find . -name ".DS_Store" -delete

# Commit and push
git add .
git commit -m "$COMMIT_MSG" || echo "No changes to commit"
git push origin gh-pages

echo -e "${GREEN}✅ Deployed to gh-pages${NC}"

# ============================================
# Step 4: Return to original branch & optionally push it
# ============================================
echo -e "\n${YELLOW}🔙 Returning to ${CURRENT_BRANCH}...${NC}"
git checkout "$CURRENT_BRANCH"
if [ "$STASH_CREATED" = "1" ]; then
    git stash pop --quiet 2>/dev/null || echo -e "${YELLOW}⚠️  Could not auto-pop stash — run 'git stash pop' manually.${NC}"
    STASH_CREATED=0
fi

# Disarm the trap: we're back on the source branch cleanly.
trap - EXIT INT TERM

# If the source branch has commits ahead of its upstream, offer to push them too.
UPSTREAM="origin/${CURRENT_BRANCH}"
if git rev-parse --verify --quiet "$UPSTREAM" >/dev/null; then
    AHEAD=$(git rev-list --count "${UPSTREAM}..HEAD" 2>/dev/null || echo 0)
    if [ "$AHEAD" -gt 0 ]; then
        echo -e "\n${YELLOW}📤 ${CURRENT_BRANCH} is ${AHEAD} commit(s) ahead of ${UPSTREAM}. Pushing...${NC}"
        git push origin "$CURRENT_BRANCH"
        echo -e "${GREEN}✅ Pushed ${CURRENT_BRANCH}${NC}"
    fi
fi

echo -e "\n${GREEN}✨ Deployment complete!${NC}"
echo -e "🌍 Your site will be available at: https://tomikrys.github.io/svatba/"