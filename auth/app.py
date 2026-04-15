import os
import hmac
import hashlib
import time
import json
import io

from flask import Flask, request, Response, render_template, redirect, make_response
import pyotp
import qrcode
import qrcode.image.svg

app = Flask(__name__)

SECRET_FILE = "/data/totp_secret.json"
COOKIE_SECRET = os.environ.get("COOKIE_SECRET", "change-me-nerp")
SESSION_DURATION = int(os.environ.get("SESSION_DURATION", "86400"))
APP_NAME = os.environ.get("APP_NAME", "N-ERP Workbench")


def get_totp_secret():
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE) as f:
            return json.load(f)["secret"]

    secret = pyotp.random_base32()
    os.makedirs(os.path.dirname(SECRET_FILE), exist_ok=True)
    with open(SECRET_FILE, "w") as f:
        json.dump({"secret": secret, "registered": False}, f)

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=APP_NAME, issuer_name=APP_NAME)

    print(flush=True)
    print("=" * 60, flush=True)
    print("  TOTP Setup - Scan with your authenticator app", flush=True)
    print("=" * 60, flush=True)
    print(f"  Secret : {secret}", flush=True)
    print(f"  URI    : {uri}", flush=True)
    print("=" * 60, flush=True)
    print(flush=True)

    return secret


def is_registered() -> bool:
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE) as f:
            return json.load(f).get("registered", False)
    return False


def mark_registered():
    with open(SECRET_FILE) as f:
        data = json.load(f)
    data["registered"] = True
    with open(SECRET_FILE, "w") as f:
        json.dump(data, f)


def _sign(value: str) -> str:
    sig = hmac.new(COOKIE_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{sig}"


def _verify_cookie(cookie: str | None) -> bool:
    if not cookie or "." not in cookie:
        return False
    value, sig = cookie.rsplit(".", 1)
    expected = hmac.new(
        COOKIE_SECRET.encode(), value.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return False
    try:
        return time.time() < int(value)
    except ValueError:
        return False


@app.route("/auth")
def auth():
    """Called by nginx auth_request. Returns 200 or 401."""
    if _verify_cookie(request.cookies.get("totp_session")):
        return Response("OK", status=200)
    return Response("Unauthorized", status=401)


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        code = request.form.get("code", "").strip()
        secret = get_totp_secret()
        totp = pyotp.TOTP(secret)
        if totp.verify(code, valid_window=1):
            if not is_registered():
                mark_registered()
            expires = str(int(time.time()) + SESSION_DURATION)
            cookie_value = _sign(expires)
            redirect_url = request.args.get("rd", "/")
            resp = make_response(redirect(redirect_url))
            resp.set_cookie(
                "totp_session",
                cookie_value,
                max_age=SESSION_DURATION,
                httponly=True,
                samesite="Lax",
            )
            return resp
        error = "인증 코드가 올바르지 않습니다. 다시 시도해주세요."

    registered = is_registered()
    qr_svg = None
    secret_display = None
    if not registered:
        secret = get_totp_secret()
        totp_obj = pyotp.TOTP(secret)
        uri = totp_obj.provisioning_uri(name=APP_NAME, issuer_name=APP_NAME)
        img = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage)
        buf = io.BytesIO()
        img.save(buf)
        qr_svg = buf.getvalue().decode()
        secret_display = secret

    return render_template("login.html", error=error, qr_svg=qr_svg, secret=secret_display,
                           app_name=APP_NAME)


@app.route("/logout")
def logout():
    resp = make_response(redirect("/login"))
    resp.set_cookie("totp_session", "", expires=0, httponly=True, samesite="Lax")
    return resp


# Pre-load secret on startup
_secret = get_totp_secret()
