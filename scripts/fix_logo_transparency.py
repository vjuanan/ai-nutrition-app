#!/usr/bin/env python3
"""Make logo background transparent - improved version"""
from PIL import Image

def make_transparent_improved(input_path, output_path):
    """Remove light background and make it transparent"""
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        r, g, b, a = item
        # Check if pixel is close to #f8fafc (248, 250, 252) - the sidebar color
        # Using a tolerance of 20 for each channel
        if abs(r - 248) < 20 and abs(g - 250) < 20 and abs(b - 252) < 20:
            newData.append((255, 255, 255, 0))  # Completely transparent
        else:
            newData.append((r, g, b, 255))  # Keep the pixel fully opaque
    
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"✓ Saved transparent logo to {output_path}")
    print(f"  Image mode: {img.mode}, Size: {img.size}")

if __name__ == "__main__":
    # Use the original logo from the artifacts directory
    original = "/Users/juanan/.gemini/antigravity/brain/0a5357e7-ecc3-42cb-9ac8-6f14ec76c927/ai_nutrition_logo_slate_1771344155353.png"
    output = "public/images/ai-nutrition-logo.png"
    
    print("Creating transparent logo...")
    make_transparent_improved(original, output)
    
    # Also update other logo files
    import shutil
    shutil.copy(output, "app/icon.png")
    shutil.copy(output, "app/apple-icon.png")
    print("✓ Updated all logo files (sidebar, icon, apple-icon)")
