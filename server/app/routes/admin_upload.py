import os
import uuid

from flask import Blueprint, current_app, request
from werkzeug.utils import secure_filename

from app.utils.decorators import admin_required
from app.utils.respond import fail, ok

admin_upload_bp = Blueprint("admin_upload", __name__)
ALLOWED = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@admin_upload_bp.post("/admin/upload")
@admin_required
def upload():
    f = request.files.get("file")
    if not f:
        return fail("缺少文件")
    name = secure_filename(f.filename or "upload.bin")
    ext = os.path.splitext(name)[1].lower()
    if ext not in ALLOWED:
        return fail("不支持的文件类型")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    f.save(path)
    return ok({"url": f"/uploads/{filename}"})
