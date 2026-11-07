# QueueLess – Smart Appointment Booking & Real-Time Queue Management Platform

QueueLess is a production-style MERN stack web application built to eliminate physical waiting lines in service-driven businesses (clinics, salons, banks, service centers, and offices).

The application combines **scheduled appointment slot booking** with an **atomic, real-time live queue engine**, keeping customers informed of their exact ticket status, queue position, and estimated waiting time.

---

## 🏛️ System Architecture

```
+-------------------------------------------------------------------------------+
|                                CLIENT TIER                                    |
|   React.js 18 (Vite) + Tailwind CSS + Axios Interceptors + Lucide Icons       |
|   State Management: React Context API | Real-Time: Socket.IO Client           |
+-------------------------------------------------------------------------------+
                                      │  ▲
                   REST JSON Requests │  │ WebSocket Events (Phase 6)
                         (CORS/Proxy) │  │
                                      ▼  │
+-------------------------------------------------------------------------------+
|                              APPLICATION TIER                                 |
|   Node.js + Express.js API Gateway (Modular Service-Controller-Route Layer)   |
|   Security: Helmet, CORS Whitelisting, Express Rate Limit, Central Errors     |
+-------------------------------------------------------------------------------+
                                      │  ▲
                       Mongoose ODM   │  │ Document Results & Change Streams
                                      ▼  │
+-------------------------------------------------------------------------------+
|                                DATABASE TIER                                  |
|   MongoDB Atlas (Document Store with Compound & Unique Indexes)               |
+-------------------------------------------------------------------------------+
```

---

## 📂 Project Structure

```
queueless/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── assets/             # Static media assets (logos, illustrations)
│   │   ├── components/         # Reusable UI components & Phase diagnostics
│   │   ├── context/            # React Contexts (AuthContext, QueueContext)
│   │   ├── hooks/              # Custom hooks (useSocket, useAuth)
│   │   ├── layouts/            # Page shell layouts (Sidebar, Header)
│   │   ├── pages/              # View pages (Customer, Provider, Staff, Admin)
│   │   ├── routes/             # Protected and public route definitions
│   │   ├── services/           # Axios HTTP client instances & API methods
│   │   ├── styles/             # Tailwind CSS & global styles
│   │   ├── utils/              # Frontend formatting helpers (dates, numbers)
│   │   ├── App.jsx             # Top-level root component
│   │   └── main.jsx            # React 18 DOM mount entrypoint
│   ├── index.html              # HTML5 entrypoint
│   ├── tailwind.config.js      # Tailwind styling theme
│   ├── vite.config.js          # Vite configuration & dev proxy
│   └── package.json            # Client dependencies
│
├── server/                     # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Database connection & third-party configs
│   │   ├── controllers/        # Thin HTTP request/response handlers
│   │   ├── middleware/         # Security, Auth, RBAC, 404 & Central Errors
│   │   ├── models/             # Mongoose schemas & indexes
│   │   ├── routes/             # Express API routing definitions
│   │   ├── services/           # Core domain business logic
│   │   ├── sockets/            # Socket.IO connection & event handlers
│   │   ├── validators/         # Request schema validation
│   │   ├── utils/              # Date math, ticket formatters, logger
│   │   ├── jobs/               # Background scheduled maintenance tasks
│   │   ├── app.js              # Express app definition & middleware pipeline
│   │   └── server.js           # Server listen & process lifecycle entrypoint
│   ├── .env.example            # Environment template
│   ├── .env                    # Local environment variables
│   └── package.json            # Server dependencies
│
├── DEVELOPMENT_PROGRESS.md     # Phase-by-phase implementation tracker
├── README.md                   # Project documentation
└── package.json                # Monorepo root orchestration scripts
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios with centralized request/response interceptors
- **Visualizations**: Recharts
- **Real-Time Client**: Socket.IO Client

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database ODM**: Mongoose
- **Security**: Helmet, CORS, Morgan logger
- **Environment**: Dotenv

### Database
- **Database**: MongoDB Atlas

---

## ⚡ Getting Started (Local Development)

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (or local MongoDB)

### 2. Configure Environment Variables
Inside `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/queueless?retryWrites=true&w=majority
```

Inside `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Start the Backend API
```powershell
cd server
npm run dev
```
The server will start on `http://localhost:5000`. You can test it in your browser or Postman at:
`http://localhost:5000/api/health`

### 4. Start the Frontend Client
In a second terminal:
```powershell
cd client
npm run dev
```
Open `http://localhost:5173` in your browser. You will see the **Phase 1 Interactive Diagnostics Dashboard** showing live API health and database connectivity.

---

## 📅 Phased Roadmap
- [x] **Phase 1**: Project Initialization, Express Pipeline, Vite Setup & Health Checks
- [ ] **Phase 2**: Authentication, JWT Cookies, Password Hashing & RBAC Middleware
- [ ] **Phase 3**: Business Management, Profiles, Services, Staff & Schedules
- [ ] **Phase 4**: Appointment Booking Engine, Conflict-Free Slot Generation
- [ ] **Phase 5**: Real-Time Queue Management Engine & Atomic Counters
- [ ] **Phase 6**: Socket.IO Real-Time Updates & Isolated Rooms
- [ ] **Phase 7**: Comprehensive Frontend Dashboards (4 User Roles)
- [ ] **Phase 8**: Waiting-Time Estimation, Reviews & Email Alerts
- [ ] **Phase 9**: Business Analytics & Platform Reports (Recharts)
- [ ] **Phase 10**: Automated Testing & Concurrency Validation
- [ ] **Phase 11**: Production Deployment
- [ ] **Phase 12**: Documentation & Interview Masterclass

