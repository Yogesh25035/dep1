# NetGuard IDS

A full-stack Intrusion Detection System trained on the NSL-KDD dataset using a Random Forest model, with a React UI and Django REST interface.

## 1. Google Colab ML Model

1. Go to Google Colab and copy/upload `ML_Colab_NetGuard.ipynb`.
2. Upload the `KDDTrain+.csv` (NSL-KDD dataset) to the Colab workspace.
3. If you have an Ngrok Authentication Token, place it in the ngrok.set_auth_token line inside the notebook.
4. Run all cells. The script will train the `RandomForestClassifier`.
5. At the end, a public API URL via `ngrok` will be printed:
   `* NGROK API URL: https://xxxx-xxxx.ngrok.io`

> **Note:** Keep the Colab notebook running to keep the Ngrok proxy active.

## 2. Django Backend

1. In the `d:\idsapp` folder, copy `.env.example` to `.env`.
2. Update the `.env` file with the Ngrok URL copied from Colab:
   ```env
   RF_API_URL=https://xxxx-xxxx.ngrok.io
   ```
3. Initialize the database and run the Django backend:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # (or .\.venv\Scripts\Activate.ps1 on Windows)
   pip install -r requirements.txt
   
   python manage.py migrate
   python manage.py runserver
   ```
   Django runs on `http://127.0.0.1:8000`.

## 3. React Frontend 

1. For development, navigate to the `frontend` folder:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   React runs on `http://localhost:5173` and proxies `/api` calls to Django natively.

2. **For Production Build:**
   ```bash
   cd frontend
   npm run build
   ```
   Once built, you can use `python manage.py runserver` from the root folder, and Django will serve the bundled React application at `http://127.0.0.1:8000/`.

## 4. Cloudflare Deployment
1. To deploy behind Cloudflare, host the application on a VPS/PaaS (e.g. Render, Heroku) where Python & Node.js are supported.
2. In your `.env`, set:
   ```env
   CLOUDFLARE_DOMAIN=your-secure-domain.com
   DEBUG=False
   ```
3. Set your DNS records in Cloudflare to proxy the web traffic to your VPS IP address (Orange Cloud active).
4. Utilize `wrangler.toml` if deploying custom Workers Gateway routing in front of the application.
