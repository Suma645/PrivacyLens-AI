import urllib.request
import json
import os

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
img_path = r'C:\Users\WIN10\.gemini\antigravity\brain\93456651-3525-41db-b038-40e0ef5be93f\.user_uploaded\media_1793362101804_dfac7382.png'

with open(img_path, 'rb') as f:
    img_data = f.read()

body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="screenshot"; filename="user_uploaded.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8') + img_data + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req = urllib.request.Request('http://127.0.0.1:5000/api/analyze', data=body)
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

resp = urllib.request.urlopen(req)
result = json.loads(resp.read().decode())

print('Success:', result.get('success'))
print('Confidentiality Score:', result.get('confidentiality_score'), f"/ 100 ({result.get('risk_classification')})")
print('Total Detections:', len(result.get('detections', [])))
for d in result.get('detections', []):
    print('  •', f"[{d['risk_severity']}]", d['category'], ':', d['extracted_text'])
