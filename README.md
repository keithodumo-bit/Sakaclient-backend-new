SakaClient Backend - Quick Start (fresh)
---------------------------------------

This backend is demo-ready with mocked payments and simulated call behavior.
Customer care number: 0758170835

Files:
- server.js
- package.json
- .env.example
- data/sakaclient.db (pre-initialized)
- README.md

Local run:
1. Install Node.js v16+
2. unzip and cd into folder
3. npm install
4. copy .env.example -> .env (edit if needed)
5. npm start
6. Visit http://localhost:8080/ping

Deploy to Render.com:
1. Create a GitHub repo and upload all files (or use Render's GitHub connect).
2. On Render -> New -> Web Service -> connect repo
3. Build Command: npm install
   Start Command: node server.js
4. Deploy; when live, test: https://your-render-url/ping

Important endpoints:
- GET  /ping
- GET  /api/health
- POST /api/auth/login-phone   { phone }
- GET  /api/auth/access/:phone
- POST /api/payments/start    { phone, plan }  // plan: daily|weekly|monthly (simulated)
- POST /api/payments/activate/manual  { phone, plan } (testing)
- POST /api/calls/originate   { phone, clientNumber, mode, message }
- GET  /api/calls/history/:phone

Note: Payments and SIP calls are simulated for the demo. We'll wire real Daraja and SIP later.
