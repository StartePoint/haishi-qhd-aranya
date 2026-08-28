from flask import jsonify


def ok(data=None, message="成功"):
    return jsonify({"code": 0, "message": message, "data": data if data is not None else {}})


def fail(message, code=1, http_status=200):
    return jsonify({"code": code, "message": message, "data": {}}), http_status
