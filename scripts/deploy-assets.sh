#!/bin/bash
# PWS Asset Deployment Script
# Gemini에서 생성된 에셋을 Assets.xcassets에 배치

set -e

GEMINI_DIR="/Users/taewoo/.gemini/antigravity-cli/brain/bbf6025d-cc0d-48e2-87bf-f750c858c88f"
ASSETS_DIR="/Users/taewoo/Developer/OwnDO/app/apps/ios-native/PWSNativePreview/Assets.xcassets"

echo "=== PWS Asset Deployment ==="

# Function: create imageset for a single image
create_imageset() {
    local name="$1"
    local source_file="$2"
    local imageset_dir="$ASSETS_DIR/${name}.imageset"
    mkdir -p "$imageset_dir"
    cp "$source_file" "$imageset_dir/${name}.png"
    cat > "$imageset_dir/Contents.json" << EOF
{
  "images" : [
    { "filename" : "${name}.png", "idiom" : "universal", "scale" : "1x" },
    { "idiom" : "universal", "scale" : "2x" },
    { "idiom" : "universal", "scale" : "3x" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
EOF
    echo "  ✅ $name"
}

echo "--- Sky Backgrounds ---"
for f in "$GEMINI_DIR"/sky_*.png; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .png | sed 's/_[0-9]*$//')
    create_imageset "$name" "$f"
done

echo "--- Avatar Poses ---"
for f in "$GEMINI_DIR"/avatar_pose_*.png; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .png | sed 's/_[0-9]*$//')
    create_imageset "$name" "$f"
done

echo "--- Avatar Faces ---"
for f in "$GEMINI_DIR"/avatar_face_*.png; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .png | sed 's/_[0-9]*$//')
    create_imageset "$name" "$f"
done

echo "--- Outfits ---"
for f in "$GEMINI_DIR"/outfit_*.png; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .png | sed 's/_[0-9]*$//')
    create_imageset "avatar_${name}" "$f"
done

echo ""
echo "=== Deployment Complete ==="
echo "Total imagesets: $(ls -d "$ASSETS_DIR"/*.imageset 2>/dev/null | wc -l | tr -d ' ')"
