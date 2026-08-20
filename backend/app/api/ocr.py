import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File
from app.utils.response import success, error

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

@router.post("/upload-receipt")
async def upload_receipt(file: UploadFile = File(...)):
    try:
        content = await file.read()
            
        os.makedirs("static/receipts", exist_ok=True)
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join("static/receipts", filename)
        
        async with aiofiles.open(filepath, 'wb') as out_file:
            await out_file.write(content)
            
        receipt_url = f"/static/receipts/{filename}"

        return success("Receipt uploaded successfully", data={"receipt_url": receipt_url})
    except Exception as e:
        return error("Receipt upload failed", "SERVER_ERROR", str(e), 500)
