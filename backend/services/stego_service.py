import numpy as np
from PIL import Image
import hashlib
from Cryptodome.Cipher import AES
from Cryptodome.Random import get_random_bytes
import io
import base64

MAGIC = b'PSTE'

class StegoService:
    """
    High-Security LSB (Least Significant Bit) Steganography Service.
    Embeds and extracts secret messages into lossless PNG images.
    Supports optional authenticated AES-256-GCM encryption with PBKDF2 key derivation.
    """
    def __init__(self):
        pass

    def encode(self, pil_image, message_str, password=None):
        """
        Embeds message_str into pil_image using LSB steganography.
        If password is provided, encrypts with AES-256-GCM.
        Returns new PIL.Image.
        """
        if not message_str:
            raise ValueError("Secret message cannot be empty.")

        raw_bytes = message_str.encode('utf-8')
        
        if password:
            salt = get_random_bytes(16)
            key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 10000, 32)
            cipher = AES.new(key, AES.MODE_GCM)
            ciphertext, tag = cipher.encrypt_and_digest(raw_bytes)
            # Format: 'E' + 16 salt + 16 nonce + 16 tag + ciphertext
            payload = b'E' + salt + cipher.nonce + tag + ciphertext
        else:
            payload = b'P' + raw_bytes

        full_payload = MAGIC + len(payload).to_bytes(4, 'big') + payload
        bits = ''.join(format(b, '08b') for b in full_payload)

        img_rgb = pil_image.convert('RGB')
        img_arr = np.array(img_rgb)
        total_slots = img_arr.size

        if len(bits) > total_slots:
            max_bytes = (total_slots - 64) // 8
            raise ValueError(f"Message exceeds image storage capacity. Maximum capacity is {max(0, max_bytes)} characters.")

        flat = img_arr.flatten()
        for i, bit in enumerate(bits):
            flat[i] = (int(flat[i]) & 0xFE) | int(bit)

        stego_arr = flat.reshape(img_arr.shape).astype(np.uint8)
        return Image.fromarray(stego_arr)

    def decode(self, pil_image, password=None):
        """
        Extracts hidden message from pil_image.
        Returns decoded string.
        """
        img_rgb = pil_image.convert('RGB')
        img_arr = np.array(img_rgb)
        flat = img_arr.flatten()

        if flat.size < 64:
            raise ValueError("Image too small to contain a hidden steganography payload.")

        # Read magic header + length (64 bits)
        header_bits = ''.join(str(flat[i] & 1) for i in range(64))
        header_bytes = bytes(int(header_bits[i:i+8], 2) for i in range(0, 64, 8))

        if header_bytes[:4] != MAGIC:
            raise ValueError("No Privacy Lens hidden message found in this image.")

        payload_len = int.from_bytes(header_bytes[4:8], 'big')
        total_bits = 64 + payload_len * 8

        if total_bits > flat.size:
            raise ValueError("Corrupted steganography payload header.")

        payload_bits = ''.join(str(flat[i] & 1) for i in range(64, total_bits))
        payload = bytes(int(payload_bits[i:i+8], 2) for i in range(0, len(payload_bits), 8))

        mode = payload[:1]

        if mode == b'P':
            # Unencrypted payload
            return {
                "message": payload[1:].decode('utf-8', errors='replace'),
                "encrypted": False
            }
        elif mode == b'E':
            # Encrypted payload
            if not password:
                return {
                    "message": None,
                    "encrypted": True,
                    "needs_password": True,
                    "error": "This hidden message is encrypted with a passcode. Please enter the passcode to decrypt."
                }

            salt = payload[1:17]
            nonce = payload[17:33]
            tag = payload[33:49]
            ciphertext = payload[49:]

            key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 10000, 32)
            try:
                cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
                plaintext = cipher.decrypt_and_verify(ciphertext, tag)
                return {
                    "message": plaintext.decode('utf-8'),
                    "encrypted": True
                }
            except Exception:
                raise ValueError("Incorrect passcode. Decryption and integrity verification failed.")
        else:
            raise ValueError("Unrecognized payload format.")

    def pil_to_base64(self, pil_image):
        buf = io.BytesIO()
        pil_image.save(buf, format='PNG')
        buf.seek(0)
        encoded = base64.b64encode(buf.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{encoded}"
