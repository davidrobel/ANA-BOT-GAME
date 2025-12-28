# Ana Bot - Implementation Walkthrough & Deployment Guide

This document provides a comprehensive guide to installing, configuring, and deploying the **Ana Bot** (WhatsApp Mystery Game) on both **Windows** and **Linux** environments.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your system:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL Server**: v8.0 or v9.0
- **Git**: For version control and deployment
- **Google Chrome / Chromium**: Required by `whatsapp-web.js` for session emulation.

---

## 🛠️ 1. Database Setup

1. Log in to your MySQL terminal or use a GUI (like MySQL Workbench).
2. Create the database:
   ```sql
   CREATE DATABASE bot_ana;
   ```
3. Ensure you have a user with full privileges. For development, you might use:
   - **User**: `root`
   - **Password**: `your_password` 

---

## 📦 2. Installation

1. **Clone the Repository** (if not already local):
   ```bash
   git clone git@github.com:davidrobel/ANA-BOT-GAME.git
   cd ANA-BOT-GAME
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` folder:
   ```env
   DATABASE_URL="mysql://root:your_password@localhost:3306/bot_ana"
   PORT=3000
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```

---

## 🚀 3. Building for Production

To optimize the application for performance and security, you should build the files:

```bash
# Build Frontend
cd frontend
npm run build

# Build Backend (transpiles TypeScript to JS)
cd ../backend
npm run build
```

---

## 🖥️ 4. Deployment - Windows

### Backend (Running in background)
1. Install **PM2** globally:
   ```powershell
   npm install -g pm2
   ```
2. Start the backend:
   ```powershell
   cd backend
   pm2 start dist/index.js --name "ana-bot-api"
   ```

### Frontend
Since the frontend build is static, you can use a simple server or the Vite preview:
```powershell
cd frontend
npx serve -s dist -p 80
```
*(Note: Port 80 requires Administrator privileges)*

---

## 🐧 5. Deployment - Linux (Ubuntu/Debian)

### Chrome Dependencies (CRITICAL)
Linux servers usually lack dependencies for the headless browser. Run:
```bash
sudo apt-get update
sudo apt-get install -y libgbm-dev gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### Process Management
1. Install PM2:
   ```bash
   sudo npm install -g pm2
   ```
2. Start the Backend:
   ```bash
   cd backend
   pm2 start dist/index.js --name "ana-bot-api"
   pm2 save
   pm2 startup
   ```

### Reverse Proxy (Nginx)
Highly recommended to serve the Frontend on port 80 and the API on port 3000.
1. Install Nginx: `sudo apt install nginx`
2. Configure `/etc/nginx/sites-available/default`:
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;

       location / {
           root /path/to/ana-bot/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:3000/api;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   ```
3. Restart Nginx: `sudo systemctl restart nginx`

---

## 🔍 6. Verification

1. Access the dashboard via browser.
2. Login: `admin` / `admin`.
3. Go to **Gerenciar Usuários** to change your password.
4. Go to **Conectar App** to scan the WhatsApp QR Code.

---

## 🐋 7. Deployment - Docker (Recommended)

Docker is the easiest way to deploy everything at once, including the database.

1. **Install Docker and Docker Compose** on your system.
2. **Configure Passwords**: 
   - Rename `.env.example` to `.env`.
   - Change `DB_PASSWORD` to your desired password.
3. **Run the Application**:
   ```bash
   docker-compose up -d --build
   ```

> [!CAUTION]
> **Alteração de Senha após o primeiro Start**: Se você já rodou o Docker uma vez e decidir mudar a senha no `.env`, o MySQL não atualizará a senha automaticamente devido ao volume persistente. Para mudar a senha e limpar o banco:
> 1. `docker-compose down -v` (Isso apaga os dados do banco!)
> 2. `docker-compose up -d --build`

### Services created by Docker:
- **db**: MySQL 8.0 accessible on port 3306.
- **backend**: The Node.js API accessible on port 3000.
- **frontend**: The Nginx server serving the build on port 80.

### Useful Docker Commands:
- **View logs**: `docker-compose logs -f`
- **Stop app**: `docker-compose down`
- **Restart after changes**: `docker-compose up -d --build`

> [!IMPORTANT]
> **Persistência de Dados**: O Docker está configurado para persistir a pasta `backend/uploads` (imagens) e as sessões do WhatsApp (`backend/.wwebjs_auth`). Se você deletar os containers, esses arquivos **não serão perdidos** pois estão mapeados para pastas locais no seu servidor.

---

## ⚠️ Important Notes
- **Security**: The `.gitignore` is already configured to skip `.env` and `.wwebjs_auth`. Never share these files.
- **WhatsApp**: Keep your phone connected to the internet for the first sync.
- **Builds**: Every time you change the code, remember to run `npm run build` again and restart the PM2 task (`pm2 restart all`). If using Docker, run `docker-compose up -d --build`.
