# Signify iD - Backend Server

<p align="center">
  <strong>Modern Identity & Access Management Backend API</strong>
</p>

---

## 🚀 Overview

This repository contains the backend infrastructure for **Signify iD**, a comprehensive Identity-as-a-Service (IDaaS) platform. Built with a focus on security, performance, and scalability, this server handles authentication, authorization, user management, and automated workflows.

## ✨ Core Features

### 🔐 Authentication & Security

- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA support.
- **Passkey Support**: WebAuthn/Passkeys integration for passwordless login.
- **Magic Links**: Email-based authentication.
- **JWT & Session Management**: Secure token issuing and session tracking with Redis.
- **Argon2 Hashing**: Industry-standard password hashing.

### 👥 User & Org Management

- **RBAC (Role-Based Access Control)**: Granular permission management.
- **Multi-Tenancy**: Complete isolation of organization data.
- **Invitations**: Workflow for inviting and onboarding users to organizations.

### 🔧 Developer Tools

- **OAuth 2.0 Provider**: Issue and manage tokens for third-party integrations.
- **Workflow Engine**: Backend support for complex identity workflows.
- **Audit Logs**: Detailed event tracking for security and compliance.

### 💳 Billing Integration

- **Stripe**: Usage tracking, subscription management, and checkout sessions.

## 🛠️ Tech Stack

- **Framework**: Express 5 (TypeScript)
- **ORM**: Prisma
- **Database**: PostgreSQL (Primary), Redis (Session & Cache)
- **Deployment**: Optimized for Vercel/Serverless
- **Communications**: Nodemailer for transactional emails

## 📁 Project Structure

```
signifyid-server/
├── api/                   # Serverless functions (Main entry point for Vercel)
├── src/                   # Core business logic
│   ├── cache/             # Redis caching & session logic
│   ├── config/            # Caching, DB, Logger, Stripe configs
│   ├── controllers/       # HTTP request handlers
│   ├── jobs/              # Background jobs & cron tasks
│   ├── mail/              # Email templates & mailing logic
│   ├── middleware/        # Auth, Validation, CORS, Rate-limiting
│   ├── models/            # Data access abstractions
│   ├── routes/            # API endpoint definitions
│   ├── services/          # Pure business logic core
│   ├── types/             # Flow & interface definitions
│   └── views/             # Data transformation for API responses
├── prisma/                # Database schema (schema.prisma)
└── vercel.json            # Deployment & routing configuration
```

## 🔌 API Documentation

The server exposes a RESTful API. Key endpoints include:

- `/api/auth/login` - Authenticate users
- `/api/auth/register` - Create new accounts
- `/api/users` - Organization user management
- `/api/sessions` - Active session monitoring
- `/api/webauthn` - Passkey registration and auth
- `/api/billing` - Subscription and portal access

---

Built with ❤️ by the **Sundareeshwaran**
