import io
import os
import qrcode
from flask import Blueprint, send_file
from dotenv import load_dotenv

load_dotenv()

qr_bp = Blueprint("qr", __name__)

@qr_bp.route("/gate-qr", methods=["GET"])
def generate_gate_qr():
    frontend_base = os.getenv("FRONTEND_BASE_URL")
    print(frontend_base)
    if not frontend_base:
        return {"error": "FRONTEND_BASE_URL not set"}, 500

    visitor_entry_url = f"{frontend_base}/visitor-entry"

    qr_img = qrcode.make(visitor_entry_url)

    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    return send_file(
        buf,
        mimetype="image/png",
        as_attachment=False,
        download_name="gate_qr.png"
    )
