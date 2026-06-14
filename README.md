# 🤖 AI Internship Allocation & Recommendation System
### Complete Project — Frontend + Backend + Database

---

## 📁 EXACT FOLDER STRUCTURE — Save Files Exactly Like This

```
AI-Internship-System/                     ← Create this main folder
│
├── 📂 frontend/                           ← Put ALL HTML/CSS/JS files here
│   ├── index.html                         ✅ Home page
│   ├── login.html                         ✅ Login & Register page
│   ├── about.html                         ✅ About project page
│   ├── student-management.html            ✅ Add/Edit/Delete students
│   ├── student-dashboard.html             ✅ Student profile + AI recs
│   ├── recommendations.html               ✅ Internship listings
│   ├── admin-dashboard.html               ✅ Admin panel (admin only)
│   ├── contact.html                       ✅ Contact & team page
│   ├── style.css                          ✅ Global stylesheet
│   ├── script.js                          ✅ Auth + AI engine + Storage
│   └── api.js                             ✅ Backend API client (optional)
│
└── 📂 backend/                            ← Extract aiias-backend.zip here
    ├── server.js                          ✅ Main Express server
    ├── package.json                       ✅ Dependencies list
    ├── nodemon.json                       ✅ Dev auto-restart config
    ├── .env                               ✅ Environment variables
    │
    ├── 📂 config/
    │   └── db.js                          ✅ MongoDB connection
    │
    ├── 📂 models/
    │   ├── Admin.js                       ✅ Admin user schema
    │   ├── Student.js                     ✅ Student profile schema
    │   ├── Internship.js                  ✅ Internship listing schema
    │   └── Application.js                 ✅ Application schema
    │
    ├── 📂 controllers/
    │   ├── authController.js              ✅ Login/logout/register
    │   ├── studentController.js           ✅ Student CRUD + recommendations
    │   ├── internshipController.js        ✅ Internship CRUD
    │   ├── applicationController.js       ✅ Apply + status update
    │   └── adminController.js             ✅ Dashboard + reports
    │
    ├── 📂 routes/
    │   ├── authRoutes.js                  ✅ /api/auth/*
    │   ├── studentRoutes.js               ✅ /api/students/*
    │   ├── internshipRoutes.js            ✅ /api/internships/*
    │   ├── applicationRoutes.js           ✅ /api/applications/*
    │   └── adminRoutes.js                 ✅ /api/admin/*
    │
    ├── 📂 middleware/
    │   ├── auth.js                        ✅ JWT protect middleware
    │   ├── errorHandler.js                ✅ Global error handler
    │   ├── upload.js                      ✅ Multer resume upload
    │   └── validate.js                    ✅ Request validation rules
    │
    └── 📂 utils/
        ├── aiMatcher.js                   ✅ AI match score algorithm
        ├── apiResponse.js                 ✅ Standard response helpers
        └── seed.js                        ✅ Database seeder script
```

---

## 🔑 LOGIN CREDENTIALS

| Role    | Email               | Password    | Redirects To           |
|---------|---------------------|-------------|------------------------|
| Admin   | admin@aiias.edu     | Admin@1234  | Admin Dashboard        |
| Student | Register yourself   | Your choice | Student Dashboard      |

> Admin account is created automatically when you run `npm run seed`

---

## ⚡ QUICK START — Frontend Only (GitHub Pages)

**If you ONLY want the website on GitHub Pages (no MongoDB):**

1. Upload all files from the `frontend/` folder to your GitHub repository
2. Enable GitHub Pages in repo Settings → Pages → Branch: main
3. The website works 100% with **browser LocalStorage** — no backend needed
4. Visit: `https://yourusername.github.io/your-repo-name/`

**That's it!** Students can register, login, add profiles, and get AI recommendations.

---

## 🚀 FULL SETUP — Frontend + Backend + MongoDB

### STEP 1 — Install Required Software

| Software | Download |
|----------|----------|
| Node.js v18+ | https://nodejs.org |
| MongoDB Community | https://mongodb.com/try/download/community |
| VS Code | https://code.visualstudio.com |

Verify installation:
```bash
node --version     # Should show v18.x.x or higher
npm --version      # Should show 9.x.x or higher
mongod --version   # Should show v6.x.x or higher
```

---

### STEP 2 — Create Folder Structure

```
1. Create folder:   AI-Internship-System/
2. Inside it create: frontend/  and  backend/
3. Copy all HTML/CSS/JS files → into frontend/
4. Extract aiias-backend.zip → into backend/
```

---

### STEP 3 — Configure .env File

Open `backend/.env` and update if needed:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/aiias_db    ← Local MongoDB
JWT_SECRET=aiias_super_secret_jwt_key_2025
ADMIN_EMAIL=admin@aiias.edu
ADMIN_PASSWORD=Admin@1234
CLIENT_ORIGIN=https://riyapawar2338.github.io   ← Your GitHub Pages URL
```

**For MongoDB Atlas (cloud):** Replace MONGO_URI with:
```
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/aiias_db
```

---

### STEP 4 — Start MongoDB

```bash
# Windows (Command Prompt as Administrator)
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

---

### STEP 5 — Install & Run Backend

Open Terminal, navigate to backend folder:

```bash
cd AI-Internship-System/backend

# Install all packages
npm install

# Seed database (creates admin + 10 internships)
npm run seed

# Start server
npm run dev
```

✅ You should see:
```
✅  MongoDB Connected: localhost
🚀  Server: http://localhost:5000
```

Test it: Open http://localhost:5000/api/health in browser.

---

### STEP 6 — Open Frontend

**With VS Code Live Server (recommended):**
1. Open VS Code → File → Open Folder → select `frontend/`
2. Install "Live Server" extension by Ritwick Dey
3. Right-click `index.html` → Open with Live Server
4. Opens at: http://127.0.0.1:5500

**OR simply:** Double-click `frontend/index.html`

---

### STEP 7 — Connect Frontend to Backend

Open `frontend/api.js` and update line 1:
```javascript
// Change this:
const API_BASE = 'http://localhost:5000/api';

// For Render deployment, change to:
const API_BASE = 'https://your-app-name.onrender.com/api';
```

---

## 🌍 DEPLOY BACKEND TO RENDER (Free)

So GitHub Pages frontend can talk to MongoDB:

1. Go to https://render.com → Sign up free
2. New → Web Service → Connect your GitHub repo
3. Set Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Add Environment Variables (same as .env):
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret
   - `NODE_ENV` = production
   - `CLIENT_ORIGIN` = https://riyapawar2338.github.io
7. Deploy → Copy your Render URL
8. Update `frontend/api.js` → `API_BASE = 'https://your-render-url.onrender.com/api'`
9. Push to GitHub

---

## 🌐 ALL API ENDPOINTS

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Admin login | No |
| POST | /auth/logout | Logout | Yes |
| GET | /auth/me | Current admin | Yes |
| GET | /students | List all students | No |
| GET | /students/:id | Get student | No |
| POST | /students | Create student | Yes |
| PUT | /students/:id | Update student | Yes |
| DELETE | /students/:id | Delete student | Yes |
| GET | /students/:id/recommendations | AI recs | No |
| GET | /internships | List internships | No |
| GET | /internships/:id | Get internship | No |
| POST | /internships | Create internship | Yes |
| PUT | /internships/:id | Update internship | Yes |
| DELETE | /internships/:id | Delete internship | Yes |
| POST | /applications | Submit application | No |
| GET | /applications | All applications | Yes |
| PATCH | /applications/:id/status | Update status | Yes |
| GET | /admin/dashboard | Dashboard stats | Yes |
| GET | /admin/allocation | Allocation report | Yes |
| GET | /admin/reports/students | Students CSV data | Yes |
| GET | /api/health | Health check | No |

---

## 🤖 AI MATCH SCORE FORMULA

```
Total Score (0-100%) =
  Skills Match   (40%) +   ← Your skills vs required skills
  Domain Match   (25%) +   ← Your preferred domain vs internship domain
  CGPA Match     (20%) +   ← Your CGPA vs minimum CGPA required
  Interest Match (15%)     ← Your interests + certifications vs domain
```

Score Labels:
- 80–100% → 🟢 Excellent Match
- 60–79%  → 🟡 Good Match
- 40–59%  → 🟠 Fair Match
- 0–39%   → 🔴 Low Match

---

## 🔧 COMMON ERRORS & FIXES

| Error | Fix |
|-------|-----|
| `Cannot find module 'express'` | Run `npm install` in backend folder |
| `MongoServerError: connection refused` | Start MongoDB: `net start MongoDB` |
| `Port 5000 already in use` | Change PORT=3001 in .env |
| Website shows 🟡 Offline Mode | Backend not running. Run `npm run dev` |
| CORS error in browser console | Set CLIENT_ORIGIN in .env to your exact URL |
| Students not showing in MongoDB | Run backend locally and use api.js with Render URL |
| Page refreshes on form submit | Use the latest student-management.html (button onclick, not form submit) |

---

## 📊 TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5 + CSS3 | Page structure & glassmorphism UI |
| Frontend | JavaScript (ES5/6) | DOM, auth, LocalStorage, AI scoring |
| Frontend | LocalStorage API | Offline data persistence |
| Backend | Node.js v18 | Server runtime |
| Backend | Express.js | REST API framework |
| Backend | JWT | Admin authentication |
| Backend | Multer | Resume file uploads |
| Database | MongoDB | NoSQL document storage |
| ODM | Mongoose | MongoDB object modeling |
| AI Layer | Custom Algorithm | Multi-factor match scoring |
| Hosting | GitHub Pages | Frontend deployment (free) |
| Hosting | Render.com | Backend deployment (free) |

---

## 🎯 FOR VIVA PRESENTATION

Demo flow:
1. Open website → show Login page
2. Login as Admin (admin@aiias.edu / Admin@1234) → show Admin Dashboard with charts
3. Logout → Register as a new Student
4. Go to Student Management → Add a student profile with skills
5. Go to Recommendations → Select the student → show AI match scores
6. Apply for an internship → show confirmation
7. Login as Admin again → Applications tab → update status to Accepted
8. Admin → Reports → Generate CSV → Download

Key talking points:
- 4-factor AI algorithm (Skills 40% + Domain 25% + CGPA 20% + Interest 15%)
- Role-based auth: Admin vs Student separation
- Real-time AI scoring computed in browser
- LocalStorage for GitHub Pages + MongoDB for production
- Full CRUD for student profiles
- CSV report generation

---

*© 2025 AI Internship Allocation & Recommendation System — Final Year Diploma Capstone Project*
