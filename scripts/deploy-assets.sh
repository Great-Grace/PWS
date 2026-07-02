#!/bin/bash
# PWS Asset Deployment Script
# Gemini에서 생성된 에셋을 Assets.xcassets에 배치

set -e

GEMINI_DIR="/Users/taewoo/.gemini/antigravity-cli/brain/bbf6025d-cc0d-48e2-87bf-f750c858c88f"
ASSETS_DIR="/Users/taewoo/Developer/OwnDO/app/apps/ios-native/PWSNativePreview/Assets.xcassets"

echo "=== PWS Asset Deployment ==="
echo "Source: $GEMINI_DIR"
echo "Target: $ASSETS_DIR"
echo ""

# Function: create imageset for a single image
create_imageset() {
    local name="$1"
    local source_file="$2"
    
    local imageset_dir="$ASSETS_DIR/${name}.imageset"
    mkdir -p "$imageset_dir"
    
    # Copy image
    cp "$source_file" "$imageset_dir/${name}.png"
    
    # Create Contents.json
    cat > "$imageset_dir/Contents.json" << EOF
{
  "images" : [
    {
      "filename" : "${name}.png",
      "idiom" : "universal",
      "scale" : "1x"
    },
    {
      "idiom" : "universal",
      "scale" : "2x"
    },
    {
      "idiom" : "universal",
      "scale" : "3x"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF
    
    echo "  ✅ $name"
}

echo "--- Sky Backgrounds ---"
for f in "$GEMINI_DIR"/sky_*.png; do
    [ -f "$f" ] || continue
    # Extract name: sky_dawn_clear_1782960255670.png → sky_dawn_clear
    basename=$(basename "$f" .png)
    # Remove trailing _timestamp
    name=$(echo "$basename" | sed 's/_[0-9]*$//')
    create_imageset "$name" "$f"
done

echo ""
echo "--- Avatar Poses ---"
for f in "$GEMINI_DIR"/avatar_pose_*.png; do
    [ -f "$f" ] || continue
    basename=$(basename "$f" .png)
    name=$(echo "$basename" | sed 's/_[0-9]*$//')
    create_imageset "$name" "$f"
done

echo ""
echo "--- Avatar Faces ---"
for f in "$GEMINI_DIR"/avatar_face_*.png; do
    [ -f "$f" ] || continue
    basename=$(basename "$f" .png)
    name=$(echo "$basename" | sed 's/_[0-9]*$//')
    create_imageset "$name" "$f"
done

echo ""
echo "=== Deployment Complete ==="
echo "Total imagesets: $(ls -d "$ASSETS_DIR"/*.imageset 2>/dev/null | wc -l | tr -d ' ')"
echo ""
echo "Next steps:"
echo "  1. Open Xcode: open apps/ios-native/PWSNativePreview.xcodeproj"
echo "  2. Verify Assets.xcassets appears in Project Navigator"
echo "  3. Build (Cmd+B) to verify"
