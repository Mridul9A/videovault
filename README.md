# VideoVault 🎬

A full-stack video upload, sensitivity analysis, and streaming platform built with Node.js + Express + MongoDB (backend) and React + Vite (frontend).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Role-Based Access Control](#role-based-access-control)
- [Video Processing Pipeline](#video-processing-pipeline)
- [Real-Time Communication](#real-time-communication)
- [Deployment](#deployment)
- [Testing](#testing)
- [Assumptions & Design Decisions](#assumptions--design-decisions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React)                    │
│  Auth Pages │ Dashboard │ Upload │ Library │ Player  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                 EXPRESS SERVER                       │
│  /api/auth   │  /api/videos   │  Socket.io           │
│  JWT Auth    │  Multer Upload │  Real-time events    │
│  RBAC MW     │  Range Stream  │                      │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼───────┐           ┌─────────▼──────┐
│   MongoDB     │           │  Local Storage  │
│  Users        │           │  /uploads/      │
│  Videos       │           │  /thumbnails/   │
└───────────────┘           └────────────────┘
```

---

## Features

### Core
- **Video Upload** — Drag-and-drop or file picker with real-time upload progress
- **Content Sensitivity Analysis** — Automated safe/flagged classification with score (0–100)
- **Real-Time Progress** — Socket.io pushes live processing stage updates to the UI
- **HTTP Range Streaming** — Efficient video playback with seek support
- **Multi-Tenant Architecture** — Each organisation's data is fully isolated
- **Role-Based Access Control** — viewer / editor / admin roles with enforced permissions

### Additional
- Video metadata extraction (duration, resolution, codec) via FFmpeg
- Thumbnail generation
- Filter library by sensitivity status, processing status, or search term
- Admin user management panel (role assignment)
- JWT authentication with 7-day expiry
- Rate limiting on all API and upload endpoints
- Comprehensive error handling and user feedback

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Backend     | Node.js (LTS), Express.js 4                    |
| Database    | MongoDB + Mongoose ODM                          |
| Real-Time   | Socket.io 4                                    |
| Auth        | JSON Web Tokens (jsonwebtoken) + bcryptjs       |
| File Upload | Multer                                         |
| Video       | fluent-ffmpeg (FFmpeg wrapper)                 |
| Frontend    | React 18, Vite 5, React Router 6               |
| HTTP Client | Axios                                          |
| Styling     | Plain CSS with CSS custom properties            |

---

## Project Structure

```
videovault/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Register, login, user management
│   │   └── videoController.js    # Upload, list, stream, delete, stats
│   ├── middleware/
│   │   ├── auth.js               # JWT verification + RBAC
│   │   ├── upload.js             # Multer configuration
│   │   └── errorHandler.js       # Global error handler
│   ├── models/
│   │   ├── User.js               # User schema with roles
│   │   └── Video.js              # Video schema with sensitivity fields
│   ├── routes/
│   │   ├── auth.js               # Auth routes
│   │   └── videos.js             # Video CRUD + streaming routes
│   ├── services/
│   │   ├── sensitivityService.js # Content analysis pipeline
│   │   └── videoService.js       # FFmpeg metadata + thumbnail
│   ├── tests/
│   │   └── api.test.js           # Supertest integration tests
│   ├── uploads/                  # Video files (git-ignored)
│   ├── .env.example
│   ├── jest.config.json
│   ├── package.json
│   └── server.js                 # Express + Socket.io entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx        # Sidebar + main content shell
    │   │   ├── VideoCard.jsx     # Video card with processing overlay
    │   │   └── UI.jsx            # Shared UI primitives
    │   ├── contexts/
    │   │   └── AuthContext.jsx   # Auth state + JWT management
    │   ├── hooks/
    │   │   └── useVideos.js      # Video list + real-time progress hooks
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx     # Stats + recent videos
    │   │   ├── Upload.jsx        # Upload form + progress UI
    │   │   ├── Library.jsx       # Filterable video grid
    │   │   ├── VideoDetail.jsx   # Player + sensitivity report
    │   │   └── Users.jsx         # Admin user management
    │   ├── services/
    │   │   ├── api.js            # Axios instance + API methods
    │   │   └── socket.js         # Socket.io client singleton
    │   ├── App.jsx               # Router + protected routes
    │   ├── index.css             # Global styles + design system
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+ (LTS)
- MongoDB 6+ (local) or a MongoDB Atlas connection string
- FFmpeg installed on your system (optional — metadata extraction degrades gracefully without it)

**Install FFmpeg:**
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt update && sudo apt install ffmpeg

# Windows — download from https://ffmpeg.org/download.html
```

### 1. Clone the repository

```bash
git clone https://github.com/your-username/videovault.git
cd videovault
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables)).

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5. Configure frontend environment

```bash
cp .env.example .env
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Default                                | Description                          |
|-----------------------|----------------------------------------|--------------------------------------|
| `PORT`                | `5000`                                 | Server port                          |
| `NODE_ENV`            | `development`                          | Environment mode                     |
| `MONGODB_URI`         | `mongodb://localhost:27017/videovault` | MongoDB connection string            |
| `JWT_SECRET`          | *(required)*                           | Secret for signing JWTs              |
| `JWT_EXPIRES_IN`      | `7d`                                   | JWT expiry duration                  |
| `UPLOAD_DIR`          | `uploads`                              | Directory for video files            |
| `MAX_FILE_SIZE`       | `500000000`                            | Max upload size in bytes (500 MB)    |
| `ALLOWED_VIDEO_TYPES` | `video/mp4,...`                        | Comma-separated MIME types           |
| `FRONTEND_URL`        | `http://localhost:5173`                | CORS origin for frontend             |

### Frontend (`frontend/.env`)

| Variable          | Default                    | Description              |
|-------------------|----------------------------|--------------------------|
| `VITE_API_URL`    | `http://localhost:5000/api`| Backend API base URL     |
| `VITE_SOCKET_URL` | `http://localhost:5000`    | Socket.io server URL     |

---

## Running the Application

### Development (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App starts on http://localhost:5173
```

### Production

```bash
# Build frontend
cd frontend
npm run build

# Start backend (serves API; frontend is deployed separately or via a CDN)
cd ../backend
NODE_ENV=production npm start
```

---

## API Documentation

All endpoints (except health) are prefixed with `/api`.

### Authentication

#### `POST /api/auth/register`
Register a new user. The first user in an organisation automatically receives the `admin` role.

**Request body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "mypassword",
  "organisation": "acme-corp"
}
```

**Response `201`:**
```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "_id": "...", "name": "Jane Smith", "email": "...", "role": "admin" }
}
```

---

#### `POST /api/auth/login`
**Request body:** `{ "email": "...", "password": "..." }`
**Response `200`:** Same shape as register.

---

#### `GET /api/auth/me` 🔒
Returns the authenticated user object.

---

#### `GET /api/auth/users` 🔒 Admin
Returns all users in the authenticated user's organisation.

---

#### `PATCH /api/auth/users/:id/role` 🔒 Admin
**Request body:** `{ "role": "viewer" | "editor" | "admin" }`

---

### Videos

All video endpoints require `Authorization: Bearer <token>`.

#### `POST /api/videos/upload` 🔒 Editor/Admin
Upload a video file using `multipart/form-data`.

| Field         | Type   | Required | Description            |
|---------------|--------|----------|------------------------|
| `video`       | File   | Yes      | The video file         |
| `title`       | String | No       | Defaults to filename   |
| `description` | String | No       |                        |
| `tags`        | String | No       | Comma-separated tags   |
| `category`    | String | No       | Video category         |

Returns `201` immediately. Processing runs asynchronously.

---

#### `GET /api/videos`
Returns paginated list of videos accessible to the authenticated user.

**Query params:**

| Param         | Description                                      |
|---------------|--------------------------------------------------|
| `status`      | Filter by: `queued`, `processing`, `completed`, `failed` |
| `sensitivity` | Filter by: `safe`, `flagged`, `pending`          |
| `search`      | Search by title (case-insensitive)               |
| `tags`        | Comma-separated tags to filter by                |
| `page`        | Page number (default: 1)                         |
| `limit`       | Results per page (default: 20)                   |
| `sort`        | Sort field (default: `-createdAt`)               |

---

#### `GET /api/videos/stats`
Returns aggregate counts and total storage for the user's videos.

---

#### `GET /api/videos/:id`
Returns a single video's full data including sensitivity report.

---

#### `GET /api/videos/:id/stream`
Streams the video file with HTTP Range Request support. Use as `<video src="...">`.

---

#### `PATCH /api/videos/:id` 🔒 Editor/Admin
Update video metadata (title, description, tags, category).

---

#### `DELETE /api/videos/:id` 🔒 Editor/Admin
Deletes the video record and removes the file from disk.

---

### WebSocket Events (Socket.io)

Connect to the Socket.io server at the backend URL.

#### Client → Server

| Event               | Payload          | Description                      |
|---------------------|------------------|----------------------------------|
| `subscribe:video`   | `videoId: string`| Subscribe to a video's progress  |
| `unsubscribe:video` | `videoId: string`| Unsubscribe                      |

#### Server → Client

| Event                        | Payload                                      | Description                       |
|------------------------------|----------------------------------------------|-----------------------------------|
| `video:progress:<videoId>`   | `{ videoId, stage, progress, status }`       | Processing progress update        |
| `video:completed:<videoId>`  | `{ videoId, status, sensitivityResult, video }` | Processing finished            |
| `video:list:updated`         | `{ action, videoId }`                        | Video list changed (add/delete)   |

---

## Role-Based Access Control

| Action                    | Viewer | Editor | Admin |
|---------------------------|:------:|:------:|:-----:|
| View own videos           | ✓      | ✓      | ✓     |
| View all org videos       |        |        | ✓     |
| Upload videos             |        | ✓      | ✓     |
| Edit video metadata       |        | ✓      | ✓     |
| Delete videos             |        | ✓      | ✓     |
| View user list            |        |        | ✓     |
| Change user roles         |        |        | ✓     |

**Multi-tenancy:** Users only see videos belonging to their organisation. Admins see all videos within their organisation.

---

## Video Processing Pipeline

```
Upload Request
     │
     ▼
1. File Validation     — MIME type, size limit enforced by Multer
     │
     ▼
2. Metadata Extraction — ffprobe reads duration, resolution, codec
     │
     ▼
3. Thumbnail Generation — FFmpeg captures frame at 10% of duration
     │
     ▼
4. Sensitivity Analysis — 8-stage simulated pipeline with Socket.io progress
     │   • Validate file integrity
     │   • Extract video metadata
     │   • Sample video frames
     │   • Run content classifier
     │   • Analyse audio track
     │   • Detect sensitive content
     │   • Generate sensitivity report
     │   • Finalise analysis
     ▼
5. Result Saved        — sensitivityResult: "safe" | "flagged"
                         sensitivityScore: 0–100
                         sensitivityFlags: [{ type, confidence, timestamp }]
```

> **Production note:** Replace `simulateSensitivityAnalysis()` in `services/sensitivityService.js` with a real ML API (Google Video Intelligence, AWS Rekognition, or a custom FFmpeg frame-extraction + classifier pipeline).

---

## Deployment

### Backend — Render / Railway / Heroku

1. Set all environment variables in the platform dashboard
2. Set `MONGODB_URI` to your MongoDB Atlas connection string
3. Ensure `UPLOAD_DIR` points to persistent storage (configure a persistent disk on Render/Railway)
4. Set `FRONTEND_URL` to your deployed frontend URL

### Frontend — Vercel / Netlify

1. Set `VITE_API_URL` and `VITE_SOCKET_URL` to your deployed backend URL
2. Build command: `npm run build`
3. Output directory: `dist`

> For Vercel, add a `vercel.json` with SPA rewrites:
> ```json
> { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
> ```

---

## Testing

```bash
cd backend
npm test               # Run all tests
npm test -- --coverage # With coverage report
```

Tests cover:
- User registration (success, duplicate email, validation)
- User login (success, wrong password, unknown email)
- JWT authentication middleware
- Role-based access control (viewer cannot upload)
- Video listing and stats endpoints
- Health check endpoint

---

## Assumptions & Design Decisions

### Sensitivity Analysis
The sensitivity analysis is **simulated** using a deterministic algorithm based on the filename hash. This produces consistent results across runs for the same file. In production, this service should be replaced with a real ML inference API. The architecture is designed to make this a drop-in swap — only `services/sensitivityService.js` needs updating.

### File Storage
Videos are stored on the local filesystem. For production, this should be replaced with an object storage service (AWS S3, Cloudflare R2, Google Cloud Storage). The `filePath` field in the Video model stores the path, making this a straightforward migration.

### Multi-Tenancy
The `organisation` field on both Users and Videos provides basic multi-tenant data segregation. Users only see videos in their organisation. This is enforced at the controller level. For stricter isolation (e.g. separate databases per org), a more advanced strategy would be needed.

### First-User Admin
The first user who registers in an organisation automatically receives the `admin` role. Subsequent users receive the `editor` role by default. This avoids chicken-and-egg problems during onboarding.

### FFmpeg Optional
The app degrades gracefully if FFmpeg is not installed — metadata will be `null` and thumbnails won't generate, but video upload and streaming work without it.

### JWT Strategy
Tokens are stored in `localStorage` for simplicity. For higher security requirements, `httpOnly` cookies would be preferable to mitigate XSS risks.

### Socket.io Rooms
Progress events are emitted to global channels (`video:progress:<id>`) rather than authenticated rooms. In production, emit only to the authenticated user's socket room for security.
