import sys
import os
import easyocr
import glob

# Try to find images in the current directory or parent
images = glob.glob('/home/sahil-garg/.gemini/antigravity/brain/*/media__*.png') + glob.glob('/home/sahil-garg/.gemini/antigravity/brain/*/uploaded_media_*.img')

reader = easyocr.Reader(['en'], gpu=False)

for img in images[:5]:
    try:
        result = reader.readtext(img, detail=0)
        full_text = " ".join(result).upper()
        print(f"--- {os.path.basename(img)} ---")
        print(full_text)
    except Exception as e:
        print(f"Error on {img}: {e}")
