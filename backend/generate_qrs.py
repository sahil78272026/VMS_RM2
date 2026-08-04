import os
import json
import qrcode
from app.database import SessionLocal
from app.models import Gate

def generate_gate_qrs():
    db = SessionLocal()
    gates = db.query(Gate).all()
    
    if not gates:
        print("No gates found in the database.")
        db.close()
        return

    os.makedirs("qr_codes", exist_ok=True)

    print(f"Generating QR codes for {len(gates)} gates...")
    for gate in gates:
        payload = {
            "society_id": gate.society_id,
            "gate_id": gate.id
        }
        json_payload = json.dumps(payload)
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(json_payload)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        filename = f"qr_codes/society_{gate.society_id}_gate_{gate.id}_{gate.name.replace(' ', '_')}.png"
        img.save(filename)
        print(f"✅ Generated: {filename}")
        
    db.close()
    print("Done!")

if __name__ == "__main__":
    generate_gate_qrs()
