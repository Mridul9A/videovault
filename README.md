VideoVault
VideoVault is a full-stack web application where users can upload videos, process them for
sensitivity, and stream them with real-time updates.
Live Demo
Frontend: https://videovault-nu.vercel.app/login
Backend: https://videovault-1-bb5m.onrender.com
Features
- Upload videos with progress
- Real-time processing updates
- Sensitivity result (safe / flagged)
- Video streaming
- Authentication (JWT)
- Role-based access
Tech Stack
Frontend: React, Vite, Axios
Backend: Node.js, Express, MongoDB, Socket.io, Multer, FFmpeg
Setup
1. Clone repo
git clone https://github.com/Mridul9A/videovault.git

2. Backend
cd backend
npm install
npm run dev

3. Frontend
cd frontend
npm install
npm run dev

Environment Variables

Backend:
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
PORT=5000

Frontend:
VITE_API_URL=http://localhost:5000/api
API
POST /api/auth/register
POST /api/auth/login
POST /api/videos/upload
GET /api/videos
GET /api/videos/:id/stream


Demo :- []

Author
Mridul