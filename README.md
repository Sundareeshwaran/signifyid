<p align="center">
  <img src="public/logo.svg" alt="Signify iD Logo" width="200" />
</p>

<h1 align="center">Signify iD</h1>

<p align="center">
  <strong>Modern Identity & Access Management Platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## 🚀 Overview

**Signify iD** is a comprehensive Identity-as-a-Service (IDaaS) platform designed for modern applications. It provides enterprise-grade authentication, authorization, and user management capabilities with a beautiful, responsive UI.

Whether you're building a SaaS product, internal tools, or consumer-facing applications, Signify iD offers the identity infrastructure you need — out of the box.

---

## ✨ Features

### 🔐 Authentication

- **Passwordless Login** — WebAuthn/Passkeys (fingerprint, Face ID, security keys)
- **Multi-Factor Authentication** — TOTP-based 2FA with authenticator apps
- **Magic Link Login** — Email-based passwordless authentication
- **OAuth 2.0 Provider** — Issue tokens for third-party applications

### 👥 User Management

- **Role-Based Access Control (RBAC)** — Fine-grained permissions system
- **Multi-Tenancy** — Full organization isolation and management
- **User Invitations** — Invite users via email with customizable roles
- **Session Management** — View and revoke active sessions across devices

### 🔧 Developer Experience

- **OAuth 2.0 Client Management** — Register and manage OAuth clients
- **Workflow Automation** — Built-in workflow engine (powered by React Flow)
- **Comprehensive API** — RESTful API with full documentation
- **SDK-Ready** — Easy integration with any frontend framework

### 💳 Billing & Subscriptions

- **Stripe Integration** — Subscription management and billing portal
- **Usage-Based Billing** — Track and bill based on usage metrics
- **Multiple Plans** — Starter, Professional, and Enterprise tiers

### 📊 Analytics & Monitoring

- **Activity Logs** — Complete audit trail of user actions
- **Session Analytics** — Track login patterns and device usage
- **Security Events** — Monitor authentication attempts and anomalies

---

## 🛠️ Tech Stack

### Frontend

| Technology                | Purpose                         |
| ------------------------- | ------------------------------- |
| **Next.js 16**            | React framework with App Router |
| **React 19**              | UI library with latest features |
| **Tailwind CSS 4**        | Utility-first styling           |
| **Radix UI**              | Accessible component primitives |
| **Framer Motion**         | Animations and transitions      |
| **React Hook Form + Zod** | Form handling and validation    |
| **Recharts**              | Data visualization              |
| **GSAP**                  | Advanced animations             |

### Backend

| Technology     | Purpose                    |
| -------------- | -------------------------- |
| **Express 5**  | Web framework              |
| **TypeScript** | Type safety                |
| **Prisma**     | ORM and database toolkit   |
| **PostgreSQL** | Primary database           |
| **Redis**      | Caching and sessions       |
| **JWT**        | Token-based authentication |
| **Argon2**     | Password hashing           |
| **Nodemailer** | Email delivery             |
| **Stripe**     | Payment processing         |

### Security

- **Helmet** — HTTP security headers
- **CORS** — Cross-origin resource sharing
- **Rate Limiting** — API abuse prevention
- **CSRF Protection** — Cross-site request forgery prevention
- **Secure Cookies** — HttpOnly, Secure, SameSite

---

## 📁 Project Structure

```
signifyid/
├── src/                    # Next.js frontend
│   ├── app/               # App Router pages
│   │   ├── dashboard/     # Admin dashboard
│   │   │   ├── analytics/ # Usage analytics
│   │   │   ├── billing/   # Subscription management
│   │   │   ├── clients/   # OAuth client management
│   │   │   ├── logs/      # Activity logs
│   │   │   ├── roles/     # Role management
│   │   │   ├── sessions/  # Session management
│   │   │   ├── settings/  # Organization settings
│   │   │   ├── users/     # User management
│   │   │   └── workflows/ # Workflow automation
│   │   ├── login/         # Authentication pages
│   │   ├── register/      # User registration
│   │   ├── mfa/           # MFA setup & verification
│   │   ├── oauth/         # OAuth consent flow
│   │   └── docs/          # Developer documentation
│   ├── components/        # Reusable UI components
│   ├── lib/               # Utilities and hooks
│   └── types/             # TypeScript definitions
│
├── server/                # Express backend
│   ├── src/
│   │   ├── config/        # Database, Redis, logger
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation, etc.
│   │   ├── models/        # Data access layer
│   │   ├── routes/        # API endpoints
│   │   ├── mail/          # Email templates
│   │   └── scripts/       # Utility scripts
│   └── prisma/            # Database schema
│
└── public/                # Static assets
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** (recommended) or npm
- **PostgreSQL** 15+
- **Redis** 7+

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/signifyid.git
cd signifyid
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server && pnpm install
```

### 3. Configure Environment

```bash
# Frontend (.env.local)
cp env.template .env.local

# Backend (server/.env)
cp server/env.template server/.env
```

Edit both files with your configuration.

### 4. Setup Database

```bash
cd server

# Run migrations
pnpm migrate
```

### 5. Start Development Servers

```bash
# Terminal 1 - Frontend (port 3000)
pnpm dev

# Terminal 2 - Backend (port 5000)
cd server && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## 🌐 API Overview

The backend exposes a RESTful API at `/api`:

| Endpoint                            | Description                    |
| ----------------------------------- | ------------------------------ |
| `POST /api/auth/login`              | User authentication            |
| `POST /api/auth/register`           | User registration              |
| `GET /api/users`                    | List organization users        |
| `GET /api/sessions`                 | List active sessions           |
| `POST /api/oauth/clients`           | Create OAuth client            |
| `POST /api/webauthn/register/begin` | Start passkey registration     |
| `POST /api/billing/checkout`        | Create Stripe checkout session |

Full API documentation is available at `/docs` in the application.

---

## 🚀 Deployment

### Production Build

```bash
# Build frontend
pnpm build

# Build backend
cd server && pnpm build
```

### Environment Variables

Ensure all production environment variables are set:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Strong random secret
- `STRIPE_SECRET_KEY` — Stripe API key
- `SMTP_*` — Email server configuration

### Recommended Platforms

- **Frontend**: Vercel, Netlify, AWS Amplify
- **Backend**: Railway, Render, AWS ECS, DigitalOcean App Platform
- **Database**: Supabase, Neon, AWS RDS
- **Redis**: Upstash, Redis Cloud

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ by <strong>Signify iD Team</strong>
</p>
