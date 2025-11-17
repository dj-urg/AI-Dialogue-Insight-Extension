#!/bin/bash

# AI Chat Exporter - Extension Validation Script
# This script checks that all required files are present and valid

echo "🔍 Validating AI Chat Exporter Extension..."
echo ""

# Track validation status
ERRORS=0

# Check required files exist
echo "📁 Checking required files..."
REQUIRED_FILES=("manifest.json" "popup.html" "popup.js" "content.js" "icon.png" "README.md")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file is missing"
        ((ERRORS++))
    fi
done

echo ""

# Validate manifest.json
echo "📋 Validating manifest.json..."
if [ -f "manifest.json" ]; then
    # Check if it's valid JSON
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "  ✓ Valid JSON syntax"
        
        # Check required fields
        if grep -q '"manifest_version"' manifest.json; then
            echo "  ✓ Contains manifest_version"
        else
            echo "  ✗ Missing manifest_version"
            ((ERRORS++))
        fi
        
        if grep -q '"name"' manifest.json; then
            echo "  ✓ Contains name"
        else
            echo "  ✗ Missing name"
            ((ERRORS++))
        fi
        
        if grep -q '"version"' manifest.json; then
            echo "  ✓ Contains version"
        else
            echo "  ✗ Missing version"
            ((ERRORS++))
        fi
        
        if grep -q '"permissions"' manifest.json; then
            echo "  ✓ Contains permissions"
        else
            echo "  ✗ Missing permissions"
            ((ERRORS++))
        fi
    else
        echo "  ✗ Invalid JSON syntax"
        ((ERRORS++))
    fi
fi

echo ""

# Validate icon
echo "🖼️  Validating icon.png..."
if [ -f "icon.png" ]; then
    if file icon.png | grep -q "PNG image data"; then
        echo "  ✓ Valid PNG image"
        
        # Check dimensions
        if file icon.png | grep -q "48 x 48"; then
            echo "  ✓ Correct dimensions (48x48)"
        else
            echo "  ⚠️  Warning: Icon should be 48x48 pixels"
        fi
    else
        echo "  ✗ Not a valid PNG image"
        ((ERRORS++))
    fi
fi

echo ""

# Check JavaScript files for syntax errors
echo "📝 Checking JavaScript files..."
for jsfile in popup.js content.js; do
    if [ -f "$jsfile" ]; then
        # Basic syntax check using node (if available)
        if command -v node > /dev/null 2>&1; then
            if node --check "$jsfile" 2>/dev/null; then
                echo "  ✓ $jsfile has valid syntax"
            else
                echo "  ✗ $jsfile has syntax errors"
                ((ERRORS++))
            fi
        else
            echo "  ⚠️  Node.js not available, skipping syntax check for $jsfile"
        fi
    fi
done

echo ""

# Check HTML file
echo "📄 Checking HTML file..."
if [ -f "popup.html" ]; then
    if grep -q "<!DOCTYPE html>" popup.html; then
        echo "  ✓ popup.html has DOCTYPE declaration"
    else
        echo "  ⚠️  Warning: popup.html missing DOCTYPE"
    fi
    
    if grep -q "<script src=\"popup.js\"></script>" popup.html; then
        echo "  ✓ popup.html references popup.js"
    else
        echo "  ✗ popup.html doesn't reference popup.js"
        ((ERRORS++))
    fi
fi

echo ""

# Check for placeholder selectors warning
echo "⚠️  Checking for placeholder selectors..."
if grep -q "Placeholder - inspect live DOM" content.js; then
    echo "  ⚠️  WARNING: content.js contains placeholder selectors"
    echo "     These need to be updated by inspecting actual Claude/DeepSeek pages"
    echo "     See TESTING_GUIDE.md for instructions"
else
    echo "  ✓ No placeholder warnings found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Summary
if [ $ERRORS -eq 0 ]; then
    echo "✅ Validation passed! Extension is ready for testing."
    echo ""
    echo "Next steps:"
    echo "  1. Open Firefox and go to about:debugging#/runtime/this-firefox"
    echo "  2. Click 'Load Temporary Add-on...'"
    echo "  3. Select manifest.json from this directory"
    echo "  4. Follow the testing guide in TESTING_GUIDE.md"
    exit 0
else
    echo "❌ Validation failed with $ERRORS error(s)."
    echo "Please fix the errors above before testing."
    exit 1
fi
