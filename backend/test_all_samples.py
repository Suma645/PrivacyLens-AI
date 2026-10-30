import urllib.request
import json
import os

samples = ["sample_banking.png", "sample_developer.png", "sample_chat.png"]
base_dir = r"C:\Users\WIN10\.gemini\antigravity\scratch\snapshield\backend\samples"

for s in samples:
    path = os.path.join(base_dir, s)
    with open(path, "rb") as f:
        img_bytes = f.read()

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"screenshot\"; filename=\"{s}\"\r\n"
        f"Content-Type: image/png\r\n\r\n"
    ).encode("utf-8") + img_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request("http://127.0.0.1:5000/api/analyze", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    print(f"[{s}] Score: {data.get('confidentiality_score')}/100, Class: {data.get('risk_classification')}, Detections: {len(data.get('detections', []))}")
