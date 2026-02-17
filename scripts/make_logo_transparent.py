#!/usr/bin/env python3
"""Make logo background transparent by removing light colors"""
from PIL import Image
import sys

def make_transparent(input_path, output_path, threshold=240):
    """Remove light background from image and make it transparent"""
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If pixel is very light (close to white/light gray), make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0))  # Transparent
        else:
            newData.append(item)
    
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    input_file = "public/images/ai-nutrition-logo.png"
    output_file = "public/images/ai-nutrition-logo-transparent.png"
    
    make_transparent(input_file, output_file)
    print("Done!")
