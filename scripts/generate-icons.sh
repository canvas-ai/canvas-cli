#!/bin/bash
set -e

# Canvas CLI Icon Generator
# Simple script to generate all platform icons from high-resolution source

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"
ICONS_DIR="$ASSETS_DIR/icons"

# Find highest resolution source image
SOURCE_PNG=""
for candidate in "logo_1024x1024.png" "logo_512x512.png" "logo_256x256.png" "logo_64x64.png"; do
    if [[ -f "$ASSETS_DIR/$candidate" ]]; then
        SOURCE_PNG="$ASSETS_DIR/$candidate"
        break
    fi
done

if [[ -z "$SOURCE_PNG" ]]; then
    echo "❌ No source PNG found in $ASSETS_DIR"
    echo "   Expected: logo_1024x1024.png, logo_512x512.png, logo_256x256.png, or logo_64x64.png"
    exit 1
fi

echo "🎨 Generating Canvas CLI platform icons"
echo "======================================="
echo "📁 Source: $SOURCE_PNG"
echo "📁 Output: $ICONS_DIR"
echo

# Create icons directory
mkdir -p "$ICONS_DIR"

# Check for ImageMagick
if ! command -v magick >/dev/null 2>&1 && ! command -v convert >/dev/null 2>&1; then
    echo "❌ ImageMagick not found"
    echo "   Install: brew install imagemagick (macOS) or apt install imagemagick (Linux)"
    exit 1
fi

# Use magick if available, fallback to convert
MAGICK_CMD="magick"
if ! command -v magick >/dev/null 2>&1; then
    MAGICK_CMD="convert"
fi

echo "🔨 Using ImageMagick: $MAGICK_CMD"
echo

# Generate Windows .ico (multi-size: 16, 32, 48, 64px in one file)
echo "📦 Generating Windows icon..."
if command -v magick >/dev/null 2>&1; then
    magick "$SOURCE_PNG" -define icon:auto-resize=64,48,32,16 "$ICONS_DIR/canvas.ico"
else
    convert "$SOURCE_PNG" \
        \( -clone 0 -resize 64x64 \) \
        \( -clone 0 -resize 48x48 \) \
        \( -clone 0 -resize 32x32 \) \
        \( -clone 0 -resize 16x16 \) \
        -delete 0 "$ICONS_DIR/canvas.ico"
fi
echo "✅ Windows icon: $ICONS_DIR/canvas.ico (contains 16,32,48,64px)"

# Generate macOS .icns (bundle containing multiple sizes + retina versions)
echo "📦 Generating macOS icon..."
if command -v iconutil >/dev/null 2>&1; then
    ICONSET_DIR="$ICONS_DIR/canvas.iconset"
    mkdir -p "$ICONSET_DIR"

    # Generate all required sizes for iconset bundle
    # .icns files contain multiple sizes: 16,32,64,128,256,512px + @2x retina versions
    sizes=(16 32 64 128 256 512)
    retina_sizes=(32 64 128 256 512 1024)

    echo "   📝 Creating iconset with sizes: ${sizes[*]} + retina @2x versions"
    for i in "${!sizes[@]}"; do
        size=${sizes[$i]}
        retina_size=${retina_sizes[$i]}

        if command -v sips >/dev/null 2>&1; then
            # Use sips on macOS (preferred)
            sips -z $size $size "$SOURCE_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null 2>&1
            sips -z $retina_size $retina_size "$SOURCE_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null 2>&1
        else
            # Fallback to ImageMagick
            $MAGICK_CMD "$SOURCE_PNG" -resize ${size}x${size} "$ICONSET_DIR/icon_${size}x${size}.png"
            $MAGICK_CMD "$SOURCE_PNG" -resize ${retina_size}x${retina_size} "$ICONSET_DIR/icon_${size}x${size}@2x.png"
        fi
    done

    # Convert iconset bundle to single .icns file
    iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/canvas.icns"
    rm -rf "$ICONSET_DIR"
    echo "✅ macOS icon: $ICONS_DIR/canvas.icns (contains all sizes + retina)"
else
    # Don't create a fake .icns file - this causes bun icon embedding to fail
    echo "⚠️  Skipping macOS icon (iconutil not available - macOS only)"
    echo "   📝 Note: Build on macOS or copy proper .icns from macOS build"
fi

# Generate Linux .png (resize to optimal size for desktop environments)
echo "📦 Generating Linux icon..."
# Most Linux desktop environments prefer 64x64 or 128x128 icons
$MAGICK_CMD "$SOURCE_PNG" -resize 128x128 "$ICONS_DIR/canvas.png"
echo "✅ Linux icon: $ICONS_DIR/canvas.png (128x128px)"

echo
echo "🎉 Icon generation completed!"
echo
echo "📁 Generated files:"
ls -la "$ICONS_DIR"
echo
echo "💡 Commit these icons to git and use in builds"
