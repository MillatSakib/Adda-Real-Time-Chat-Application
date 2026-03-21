# Backend

The backend is an Express + MongoDB API for `aDDa`. It provides cookie-based authentication, user/profile management, message persistence, Cloudinary image uploads, online presence, realtime message delivery, and Socket.IO signaling for WebRTC audio calls.

## Tech Stack

- Node.js
- Express 5
- MongoDB + Mongoose
- Socket.IO
- JWT stored in HTTP-only cookies
- bcryptjs for password hashing
- Cloudinary for image hosting

## Responsibilities

- Register and authenticate users
- Issue and validate auth cookies
- Return the contact list for the logged-in user
- Store and fetch chat history
- Upload profile pictures and message images to Cloudinary
- Track online users over Socket.IO
- Relay signaling events for audio calls

## Project Structure

```text
index.js                Server bootstrap
src/
  app.js                Express app and middleware
  controllers/          Route handlers
  routes/               Auth and message routes
  middleware/           Protected route middleware
  models/               Mongoose schemas
  lib/                  DB, Cloudinary, JWT, and Socket.IO setup
```

## Environment Variables

Create `Backend/.env` from `Backend/.env-example`.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URL` | Yes | MongoDB connection string |
| `PORT` | No | API port, defaults to `5005` |
| `JWT_SECRET` | Yes | Secret used to sign auth cookies |
| `NODE_ENV` | No | Used to decide whether cookies are `secure` |
| `CLOUDINARY_CLOUD_NAME` | Yes for uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes for uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes for uploads | Cloudinary API secret |
| `FRONTEND_URL` | No, but recommended | Additional frontend origin allowed by CORS and Socket.IO |

### Example

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

## Available Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs `nodemon index.js` |

There is currently no `start` or test script configured in `package.json`. For a plain Node run, use:

```bash
node index.js
```

## Local Development

### Prerequisites

- Node.js 20+
- MongoDB
- Cloudinary credentials if you want profile/message image uploads

### Steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `Backend/.env` with the variables above.

3. Start the API:

   ```bash
   npm run dev
   ```

If `nodemon` is not available on your machine, install it globally or run the server with `node index.js`.

## API Overview

### Auth Routes

Base path: `/api/auth`

| Method | Path | Protection | Purpose |
| --- | --- | --- | --- |
| `POST` | `/signup` | Public | Create a user, hash password, set auth cookie |
| `POST` | `/signin` | Public | Validate credentials and set auth cookie |
| `POST` | `/logout` | Public | Clear auth cookies |
| `PUT` | `/update-profile` | Protected | Upload profile picture to Cloudinary |
| `GET` | `/check` | Protected | Return the authenticated user |

### Message Routes

Primary base path: `/api/messages`

| Method | Path | Protection | Purpose |
| --- | --- | --- | --- |
| `GET` | `/users` | Protected | Return all users except the current user |
| `GET` | `/messagelist` | Protected | Alias of `/users` |
| `GET` | `/:id` | Protected | Return message history with another user |
| `POST` | `/send/:id` | Protected | Store a message and optionally upload an image |

The same router is also mounted at `/api/message` for compatibility.

## Socket.IO Events

### Presence and Messaging

- `getOnlineUsers`: broadcast list of connected user IDs
- `newMessage`: emitted to the message receiver when a new message is saved

### Call Signaling

- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:end`
- `call:decline`
- `call:busy`
- `call:unavailable`

These events only handle signaling and call state. Media itself flows peer-to-peer through WebRTC in the browser.

## Authentication Behavior

- Auth uses a JWT in an HTTP-only cookie named `token`
- Cookie lifetime is 30 days
- `secure` is enabled when `NODE_ENV === "production"`
- `sameSite` is set to `strict`
- Protected routes read the cookie, verify the token, and attach the user to `req.user`

## Data Models

### User

- `email`
- `fullName`
- `password`
- `profilePicture`
- `createdAt` / `updatedAt`

### Message

- `senderId`
- `receiverId`
- `text`
- `image`
- `createdAt` / `updatedAt`

## Docker

The backend Dockerfile runs the server directly with Node:

```bash
docker build -t chatty-backend ./Backend
docker run --rm -p 5005:5005 --env-file ./Backend/.env chatty-backend
```

In the root `docker-compose.yml`, the backend:

- Starts on port `5005`
- Reads `Backend/.env`
- Overrides `MONGODB_URL` to `mongodb://mongodb:27017/adda`
- Waits for MongoDB to become healthy before starting

## Important Notes

- Express request bodies are limited to `10mb`, which matters because images are sent as base64 strings.
- CORS and Socket.IO currently allow `http://localhost:5173`, `https://app-hp.millatsakib.com`, and `FRONTEND_URL` if it is set.
- If you deploy to a new frontend domain, update `FRONTEND_URL` and review the hardcoded allowed origins in `src/app.js` and `src/lib/socket.js`.
- There are no automated tests configured at the moment.
