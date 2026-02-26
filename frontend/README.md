# Cloudflare "iGaming Edge" Frontend (cf-casino-ui)

The client-side dashboard for the Cloudflare iGaming POC, focusing on real-time game state visualization and origin-vs-edge latency comparisons.

---

## 🎨 Design Vision: "Premium & Vibrant"

The UI is built with zero browser defaults, using:

- **Glassmorphism:** Frosted glass panels for game state.
- **Micro-Animations:** Fluid transitions for bet placement and roulette spin.
- **Performance Narration:** Real-time logging of Cloudflare edge events (DO fetches, Queue sends).
- **Audio Feedback:** CFD-native audio token brokerage for secure game sound.

---

## 📦 Tech Stack

- **Framework:** React 18 (TypeScript)
- **State:** [Lucide Icons](https://lucide.dev/), [shadcn/ui](https://ui.shadcn.com/)
- **API:** Custom Service layer for Workers + WebSocket sync.
- **Styling:** Tailwind CSS + [Google Fonts (Outfit)](https://fonts.google.com/specimen/Outfit)

---

## 🚀 Getting Started

### 1. Installation

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install
```

### 2. Run Local Dev Server

```bash
npm run dev
```

By default, the UI will attempt to connect to the backend running at `localhost:8787`.

---

## 🏗️ Folder Structure

- `/src/components`: Reusable shadcn/ui and custom components.
- `/src/hooks`: Custom hooks for WebSocket management (`useGameSocket`).
- `/src/services`: Type-safe API client for betting and auth.
- `/src/lib/utils`: Tailwind class merging and common formatting logic.

---

## ⚖️ License

Distributed under the ISC License.
