# Bennu Code

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-5-007FFF?logo=mui&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

A web-based project scaffolding tool that generates production-ready fullstack applications in seconds. Select your backend and frontend technologies, configure your project settings, and download a fully structured ZIP with optional Docker Compose support.

## Features

- **Multiple backend templates** — Quarkus + MyBatis, Spring Boot + MyBatis, Spring Boot + Quartz, Go Microservices, Java MVC
- **Multiple frontend templates** — Next.js, Angular
- **Docker Compose generation** — Automatically wired with the correct database (PostgreSQL/MySQL), health checks, volumes, and environment variables
- **Java package renaming** — Replaces all package references across the project based on your group ID
- **Two wizard modes** — Terminal-style CLI interface and a Corporate form-based interface
- **Fully client-side ZIP generation** — No server processing required; downloads happen in the browser

## Tech Stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Framework      | Next.js 16 (App Router) |
| Language       | TypeScript 5            |
| UI Library     | Material UI (MUI) 5     |
| Styling        | Tailwind CSS + Emotion  |
| Animations     | Anime.js                |
| ZIP generation | JSZip                   |
| Templates      | GitHub (Bennu org)      |

## Getting Started

### Prerequisites

- Node.js v18+
- `pnpm` (recommended) or `npm`

### Installation

```bash
# Clone the repository
git clone https://github.com/bennu/bennu-code.git
cd bennu-code

# Install dependencies
pnpm install
```

### Running

```bash
# Development server (http://localhost:3000)
pnpm dev

# Production build
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

## Project Structure

```
bennu-code/
├── app/
│   ├── layout.tsx                   # Root layout with fonts and theme
│   ├── page.tsx                     # Home page
│   └── api/
│       └── download-template/
│           └── route.ts             # Proxies template ZIPs from GitHub
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ThemeWrapper.tsx
│   ├── Toast.tsx
│   └── sections/
│       ├── Hero.tsx
│       ├── WizardSection.tsx        # Toggles between wizard modes
│       ├── Initializer.tsx          # Terminal-style wizard
│       └── CorporateInitializer.tsx
└── lib/
    ├── templates.ts                 # Template definitions and file trees
    ├── download.ts                  # ZIP build logic and Docker Compose generator
    └── ThemeContext.tsx
```

## API

### `GET /api/download-template`

Fetches a template ZIP from GitHub.

| Parameter | Required | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| `repo`    | Yes      | Repository name (e.g. `template_quarkus-mybatis`) |
| `branch`  | No       | Branch name (default: `main`)                     |

Returns: `application/zip`

## Available Templates

### Backend

| Template               | Language | Status      |
| ---------------------- | -------- | ----------- |
| Quarkus + MyBatis      | Java     | Available   |
| Go Microservices       | Go       | Available   |
| Java MVC               | Java     | Available   |
| Spring Boot + Quartz   | Java     | Available   |
| Spring Boot + MyBatis  | Java     | Available   |
| Java Multi-Module      | Java     | Coming soon |
| Quarkus CQRS (Query)   | Java     | Coming soon |
| Quarkus CQRS (Command) | Java     | Coming soon |

### Frontend

| Template | Framework | Status    |
| -------- | --------- | --------- |
| Next.js  | React     | Available |
| Angular  | Angular   | Available |

## How It Works

1. The user selects a backend and frontend template through the wizard.
2. On download, Bennu Code fetches the corresponding template ZIPs from the Bennu GitHub organization via the `/api/download-template` proxy.
3. If the backend is Java-based, package names are detected and replaced across all files using the provided group ID.
4. If Docker Compose is enabled, a `docker-compose.yml` is generated with backend, frontend, and database services pre-configured.
5. All files are bundled client-side using JSZip and downloaded as a single ZIP.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

## License

MIT

---

[bennu.cl](https://bennu.cl) · [GitHub](https://github.com/bennu)
