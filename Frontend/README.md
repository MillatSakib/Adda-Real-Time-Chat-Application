# Frontend

The frontend is a React + Vite single-page application for the `aDDa` chat experience. It handles authentication screens, the realtime chat UI, online presence, image sharing, theme selection, profile management, and browser-based audio calling.

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS 4 + DaisyUI 5
- React Router 7
- Zustand for client state
- Axios for API requests
- Socket.IO client for realtime presence and messaging
- WebRTC for audio calls

## Main Features

- Cookie-based auth flow with signup, login, auth check, and logout
- Protected chat workspace with contact sidebar and active conversation view
- Realtime message updates through Socket.IO
- Image attachments in chat messages
- Profile photo upload support
- Online/offline presence indicators
- Audio calling between online users
- Theme switching with DaisyUI themes saved in `localStorage`

## Route Map

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Protected | Main chat layout with sidebar and conversation panel |
| `/signup` | Public | User registration |
| `/login` | Public | User login |
| `/settings` | Protected | Theme chooser and preview |
| `/profile` | Protected | Profile overview and avatar upload |

## Project Structure

```text
src/
  components/    Reusable chat, layout, call, and loading UI
  pages/         Route-level screens
  store/         Zustand stores for auth, chat, calls, and theme state
  lib/           Axios client, config, and helpers
  assets/        Static assets
```

## Environment Variables

Create `Frontend/.env` from `Frontend/.env.example`.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SERVER_URL` | Yes | Backend origin, for example `http://localhost:5005` |

### API URL Resolution

The frontend derives its API base from `src/lib/config.js`:

- It starts with `VITE_SERVER_URL`
- Falls back to the browser origin if the env var is missing
- Falls back again to `http://localhost:5005`
- Strips trailing slashes and a trailing `/api` if one is provided
- Appends `/api` for Axios requests

## Available Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server on all interfaces |
| `npm run build` | Creates a production build in `dist/` |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Serves the production build locally |

## Local Development

### Prerequisites

- Node.js 20+
- A running backend API

### Steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `Frontend/.env`:

   ```env
   VITE_SERVER_URL=http://localhost:5005
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open the app at the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Docker

The frontend Dockerfile runs the Vite dev server inside the container:

```bash
docker build -t chatty-frontend ./Frontend
docker run --rm -p 5173:5173 --env-file ./Frontend/.env chatty-frontend
```

If you use the root `docker-compose.yml`, the frontend is available on `${FRONTEND_PORT:-5173}`.

## Important Notes

- API requests use `withCredentials: true`, so the backend must allow credentials and set cookies for the frontend origin.
- Calling only works in secure browser contexts: `https://` or `http://localhost`.
- The call layer uses WebRTC for media and Socket.IO for signaling and online presence.
- The Vite dev server is configured with `host: true` and currently allows the host `adda.millatsakib.com`.
- If you deploy the frontend on a new domain, update the backend CORS settings and the allowed host list in `vite.config.js`.
