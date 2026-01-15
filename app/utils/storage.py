import uuid
from app.supabase_client import supabase

ALLOWED = {"png","jpg","jpeg","webp"}

def upload_maintenance_proof(file):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED:
        raise Exception("Invalid file type")

    name = f"{uuid.uuid4()}.{ext}"

    supabase.storage.from_("maintenance-proofs").upload(
        name,
        file.read(),
        {"content-type": file.content_type}
    )

    return supabase.storage.from_("maintenance-proofs").get_public_url(name)
