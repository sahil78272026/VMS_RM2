from flask import jsonify

def api_response(data=None, message=None, status=200):
    return jsonify({"data": data, "message": message}), status
