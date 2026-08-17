import os
import uuid
import re
from fastapi import APIRouter, UploadFile, File, Depends
from app.utils.response import success, error
import easyocr
import io
import aiofiles

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

# Initialize the reader globally so it's loaded only once
# We'll use English language
reader = None

def get_reader():
    global reader
    if reader is None:
        reader = easyocr.Reader(['en'], gpu=False)
    return reader

@router.post("/scan-utr")
async def scan_utr(file: UploadFile = File(...)):
    try:
        content = await file.read()
        
        reader_instance = get_reader()
        
        # Read text from image
        # detail=0 returns a list of strings instead of bounding boxes
        result = reader_instance.readtext(content, detail=0)
        
        full_text = " ".join(result).upper()
        
        # Search for typical UPI/UTR patterns
        # UTR usually is a 12 digit number
        # Let's find any sequence of 12 contiguous digits
        utr_matches = re.findall(r'\b\d{12}\b', full_text)
        
        # Look for ID preceded by keywords like UTR, REF, TXN, TRANSACTION ID, with optional "NO"
        id_matches = re.findall(r'(?:TXN|TRANSACTION\s*(?:ID|NO)|UPI\s*REF(?:\s*NO)?|UTR)[\s:]*([A-Z0-9]{8,15})', full_text)
        
        extracted_utr = None
        if id_matches:
            extracted_utr = id_matches[0]
        elif utr_matches:
            extracted_utr = utr_matches[0]
            
        os.makedirs("static/receipts", exist_ok=True)
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join("static/receipts", filename)
        
        async with aiofiles.open(filepath, 'wb') as out_file:
            await out_file.write(content)
            
        receipt_url = f"/static/receipts/{filename}"

        if extracted_utr:
            return success("OCR scanned successfully", data={"utr_code": extracted_utr, "raw_text": full_text, "receipt_url": receipt_url})
        else:
            return success("Could not find a valid UTR code in image", data={"utr_code": None, "raw_text": full_text, "receipt_url": receipt_url})
            
    except Exception as e:
        return error("OCR scanning failed", "SERVER_ERROR", str(e), 500)
