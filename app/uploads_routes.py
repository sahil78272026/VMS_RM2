from flask import Blueprint, current_app, send_from_directory

bp = Blueprint("uploads", __name__)

@bp.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        filename
    )
