import urllib.request
import json
import os
import mimetypes

BASE_URL = "http://127.0.0.1:5000"

def test_health():
    print("[*] Testing /api/health...")
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        print("  -> Health Response:", data)
        assert data["status"] == "healthy"
        print("  [+] Health check PASSED!")

def test_analyze(sample_name):
    print(f"\n[*] Testing /api/analyze with {sample_name}...")
    sample_path = os.path.join(os.path.dirname(__file__), "samples", sample_name)
    assert os.path.exists(sample_path), f"File {sample_path} not found"

    boundary = "----WebKitFormBoundarySnapShield7MA4YWxkTrZu0gW"
    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="screenshot"; filename="{sample_name}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/analyze",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        res = json.loads(response.read().decode())
        print(f"  -> File ID: {res['file_id']}")
        print(f"  -> Detections Count: {len(res['detections'])}")
        print(f"  -> Confidentiality Score: {res['confidentiality_score']} ({res['risk_classification']})")
        print(f"  -> Breakdown: {res['breakdown']}")
        for d in res['detections'][:5]:
            print(f"     - [{d['risk_severity']}] {d['category']} :: {d['type']} -> '{d['extracted_text']}'")
        assert res["file_id"]
        assert len(res["detections"]) > 0
        assert "original_image" in res
        assert "protected_image" in res
        print(f"  [+] {sample_name} analysis PASSED!")
        return res

def test_protect(file_id, detections):
    print(f"\n[*] Testing /api/protect for file_id {file_id}...")
    # Mark the first item as keep_visible = True
    updated = list(detections)
    if updated:
        updated[0]["keep_visible"] = True

    payload = json.dumps({
        "file_id": file_id,
        "detections": updated,
        "manual_boxes": [
            {"x": 100, "y": 100, "width": 150, "height": 50, "style": "blackout"}
        ]
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/protect",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        res = json.loads(response.read().decode())
        print(f"  -> Protection applied successfully! Active Redactions: {res['active_redactions_count']}")
        print(f"  -> Residual Risk Score: {res['residual_risk']['residual_score']}/100 ({res['residual_risk']['residual_classification']})")
        assert "protected_image" in res
        print("  [+] /api/protect PASSED!")

def test_download(file_id):
    print(f"\n[*] Testing /api/download/{file_id}...")
    req = urllib.request.Request(f"{BASE_URL}/api/download/{file_id}?format=png")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        img_bytes = response.read()
        print(f"  -> Downloaded protected screenshot: {len(img_bytes)} bytes")
        assert len(img_bytes) > 1000
        # Check PNG header signature: \x89PNG
        assert img_bytes[:4] == b"\x89PNG"
        print("  [+] /api/download PNG header verification PASSED!")

if __name__ == "__main__":
    test_health()
    res1 = test_analyze("sample_banking.png")
    test_protect(res1["file_id"], res1["detections"])
    test_download(res1["file_id"])

    res2 = test_analyze("sample_developer.png")
    res3 = test_analyze("sample_chat.png")

    print("\n=======================================================")
    print("ALL SNAPSHIELD INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("=======================================================")
