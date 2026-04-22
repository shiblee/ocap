# 🚀 OCAP Local Setup Guide

This guide will help you run the **Omni-Channel Automation Platform (OCAP)** on your local Windows machine.

---

## 1. Prerequisites (Pahle yeh install karein)
Aapke computer par niche di gayi cheezein install honi chahiye:
1.  **Python 3.10+**: [Download link](https://www.python.org/downloads/)
2.  **Node.js (v18+)**: [Download link](https://nodejs.org/)
3.  **PostgreSQL**: [Download link](https://www.postgresql.org/download/windows/)
    *   Installation ke baad ek database banayein jiska naam ho: `ocap_db`
4.  **Redis for Windows**: [Download link](https://github.com/tporadowski/redis/releases)
    *   Redis server ko background mein start karke rakhein.

---

## 2. Backend Setup
1.  **Open Terminal**: `d:\ocap\backend` folder mein jayein.
2.  **Environment Setup**:
    *   Ek file banayein jiska naam ho `.env` (aap [`.env.example`](file:///d:/ocap/.env.example) ko copy karke rename kar sakte hain).
    *   Usme apna PostgreSQL password aur port check karein.
3.  **Install Dependencies**:
    ```powershell
    pip install -r requirements.txt
    ```
4.  **Run Server**:
    ```powershell
    python -m app.main
    ```
    *   Ab aapka backend `http://localhost:8000` par chalne lagega.

---

## 3. Frontend Setup
1.  **Open another Terminal**: `d:\ocap\frontend` folder mein jayein.
2.  **Install Node Modules**:
    ```powershell
    npm install
    ```
3.  **Run Dev Server**:
    ```powershell
    npm run dev
    ```
4.  **Open Browser**: Terminal mein di gayi link (maslan `http://localhost:5173`) ko open karein.

---

## 4. Default Login Details
Abhi system mein koi user nahi hai. Admin user banane ke liye aapko niche di gayi script ek baar chalani hogi:

**(Main jald hi ek bootstrap script provide karunga jo Admin user auto-create kar degi.)**

---

## 5. Troubleshooting (Agar koi problem aaye)
- **DB Connection Error**: Check karein ki PostgreSQL system par chalu hai aur `ocap_db` naam ka database bana hua hai.
- **Redis Error**: Celery worker ke liye Redis ka chalu hona bahut zaruri hai.
- **Port Busy**: Agar 8000 ya 5173 port busy hai, toh pehle purane process ko kill karein.
