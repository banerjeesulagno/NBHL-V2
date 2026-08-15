# NBHL Member Savings & Financial Management Portal

A secure, high-performance financial logging and contribution tracking application tailored for **Nijo Bhumi Home Land (NBHL)**.

Built with a modern full-stack architecture:
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Motion
- **Backend API**: Express REST API (`/server/app.ts`), Vercel Serverless Function (`/api/index.ts`)
- **Database**: Centralized PostgreSQL database (`schema.sql`, `pg` connection pool with SSL)
- **Security**: Salted bcrypt password hashing, session tokens, zero plaintext password exposure

---

## 💻 How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Database**:
   Set `DATABASE_URL` in your `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/nbhl_db
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Production Build & Start**:
   ```bash
   npm run build
   npm start
   ```

---

## 🚀 Deployment

### Deploying to Vercel
The repository includes `vercel.json` and `/api/index.ts`:
- Build Command: `npm run build`
- Output Directory: `dist`
- Set `DATABASE_URL` in Vercel Environment Variables.
