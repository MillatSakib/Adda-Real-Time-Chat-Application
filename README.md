# Chatty

Chatty is a full-stack realtime messaging project branded in the UI as `aDDa`. The repository contains a React frontend and an Express backend that work together to provide signup/login, persistent chats, image sharing, online presence, profile photos, and browser-based audio calling.

## Repository Layout

```text
Chatty/
  Frontend/   React + Vite client
  Backend/    Express + MongoDB API + Socket.IO server
  docker-compose.yml
```

## What the App Does

- User signup, login, logout, and auth persistence with cookies
- Contact list with online/offline presence
- One-to-one messaging with stored chat history
- Image attachments in messages
- Profile photo upload to Cloudinary
- Audio calls for online users
- Theme switching with DaisyUI themes

## Architecture

- The frontend talks to the backend over REST at `${VITE_SERVER_URL}/api`
- Axios sends credentials so the backend can use HTTP-only cookies for auth
- Socket.IO is used for online user tracking, realtime message delivery, and WebRTC signaling
- WebRTC handles the actual call media between browsers
- MongoDB stores users and messages
- Cloudinary stores uploaded profile pictures and message images

## Stack

### Frontend

- React 19
- Vite 8
- Tailwind CSS 4
- DaisyUI 5
- Zustand
- Axios
- Socket.IO client

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- Socket.IO
- JWT + cookie-parser
- bcryptjs
- Cloudinary

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- MongoDB
- Cloudinary account for image uploads

### 1. Install dependencies

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

### 2. Configure environment files

Frontend: create `Frontend/.env`

```env
VITE_SERVER_URL=http://localhost:5005
```

Backend: create `Backend/.env`

```env
MONGODB_URL=mongodb://localhost:27017/adda
PORT=5005
JWT_SECRET=replace-with-a-strong-secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5173
```

Note: the backend example file is named `Backend/.env-example`, while the frontend example file is `Frontend/.env.example`.

### 3. Start the backend

```bash
cd Backend
npm run dev
```

The current `dev` script uses `nodemon index.js`. If `nodemon` is not installed globally, run `node index.js` instead or install `nodemon` locally/globally.

### 4. Start the frontend

```bash
cd Frontend
npm run dev
```

The frontend usually opens on `http://localhost:5173`, and the backend usually runs on `http://localhost:5005`.

## Docker Compose

The repository includes a root `docker-compose.yml` with three services:

- `mongodb`
- `backend`
- `frontend`

Run everything with:

```bash
docker compose up --build
```

Default published ports:

- Frontend: `5173`
- Backend: `5005`

Docker notes:

- The backend container overrides `MONGODB_URL` so it connects to the Compose MongoDB service.
- The frontend container runs the Vite dev server, not a static production web server.

## Important Runtime Notes

- Audio calling requires a secure browser context, so use `https://` in production or `http://localhost` during local development.
- The backend only allows specific frontend origins for CORS and Socket.IO. Review `FRONTEND_URL` and the hardcoded origin list before deploying to a new domain.
- The Vite dev server currently allows the host `adda.millatsakib.com` in `Frontend/vite.config.js`.
- Image uploads are sent as base64 strings, and the backend request size limit is `10mb`.

## API and App Docs

- Frontend details: [Frontend/README.md](./Frontend/README.md)
- Backend details: [Backend/README.md](./Backend/README.md)
