import JSZip from "jszip"
import { TemplateItem } from "./templates"

const TEXT_EXT =
  /\.(java|kt|xml|yml|yaml|properties|gradle|go|mod|sum|json|ts|tsx|js|jsx|html|css|scss|md|txt|sh|env|gitignore)$/

/* ── helpers ──────────────────────────────────────────────────── */

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function pkgToPath(pkg: string): string {
  return pkg.replace(/\./g, "/")
}

/** Strip the top-level GitHub folder (owner-repo-sha/) from a path */
function getTopFolder(zip: JSZip): string {
  return (
    Object.keys(zip.files)
      .filter((p) => p.endsWith("/") && !p.slice(0, -1).includes("/"))
      .sort((a, b) => a.length - b.length)[0] ?? ""
  )
}

async function fetchZip(template: TemplateItem): Promise<JSZip> {
  const res = await fetch(`/api/download-template?repo=${template.repo}&branch=${template.branch}`)
  if (!res.ok) throw new Error(`Failed to fetch ${template.repo}: ${res.status}`)
  return JSZip.loadAsync(await res.arrayBuffer())
}

/** Find the common root package across all .java files in the ZIP */
async function detectBasePackage(zip: JSZip): Promise<string | null> {
  const pkgs: string[][] = []

  for (const file of Object.values(zip.files)) {
    if (file.dir || !file.name.endsWith(".java")) continue
    const text = await file.async("string")
    const match = text.match(/^\s*package\s+([\w.]+)\s*;/m)
    if (match) pkgs.push(match[1].split("."))
  }

  if (!pkgs.length) return null

  // Longest common prefix of all package segment arrays
  const minLen = Math.min(...pkgs.map((p) => p.length))
  const common: string[] = []
  for (let i = 0; i < minLen; i++) {
    const seg = pkgs[0][i]
    if (pkgs.every((p) => p[i] === seg)) common.push(seg)
    else break
  }
  const base = common.length ? common : pkgs[0]

  return base.join(".")
}

type FileMap = Record<string, string | Uint8Array>

interface Transforms {
  content?: (text: string, path: string) => string
  path?: (p: string) => string
}

async function extractFiles(zip: JSZip, transforms: Transforms = {}): Promise<FileMap> {
  const prefix = getTopFolder(zip)
  const out: FileMap = {}

  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    const path = prefix ? name.slice(prefix.length) : name
    if (!path) continue

    const outPath = transforms.path ? transforms.path(path) : path

    if (TEXT_EXT.test(path) || path === "Dockerfile" || path === ".dockerignore") {
      let text = await file.async("string")
      if (transforms.content) text = transforms.content(text, path)
      out[outPath] = text
    } else {
      out[outPath] = await file.async("uint8array")
    }
  }

  return out
}

/* ── docker-compose generator ─────────────────────────────────── */

interface DbConfig {
  serviceLines: string[]
  volume: string
}

function postgresDb(): DbConfig {
  return {
    serviceLines: [
      `  db:`,
      `    image: postgres:16-alpine`,
      `    environment:`,
      `      - POSTGRES_DB=appdb`,
      `      - POSTGRES_USER=postgres`,
      `      - POSTGRES_PASSWORD=postgres`,
      `    ports:`,
      `      - "5432:5432"`,
      `    volumes:`,
      `      - db_data:/var/lib/postgresql/data`,
      `    healthcheck:`,
      `      test: ["CMD-SHELL", "pg_isready -U postgres"]`,
      `      interval: 10s`,
      `      timeout: 5s`,
      `      retries: 5`,
      `    restart: unless-stopped`,
    ],
    volume: "db_data",
  }
}

function mysqlDb(): DbConfig {
  return {
    serviceLines: [
      `  db:`,
      `    image: mysql:8.0`,
      `    environment:`,
      `      - MYSQL_DATABASE=appdb`,
      `      - MYSQL_ROOT_PASSWORD=root`,
      `    ports:`,
      `      - "3306:3306"`,
      `    volumes:`,
      `      - db_data:/var/lib/mysql`,
      `    healthcheck:`,
      `      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]`,
      `      interval: 10s`,
      `      timeout: 5s`,
      `      retries: 5`,
      `    restart: unless-stopped`,
    ],
    volume: "db_data",
  }
}

interface BackendProfile {
  envVars: string[]
  db: DbConfig | null
}

function getBackendProfile(backend: TemplateItem): BackendProfile {
  // Go microservices — no DB assumption, just runtime env
  if (backend.badge === "Go") {
    return { envVars: ["PORT=8080"], db: null }
  }

  // Quarkus-based templates
  if (backend.badge === "Quarkus" || backend.id.startsWith("template_quarkus")) {
    return {
      envVars: [
        "QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://db:5432/appdb",
        "QUARKUS_DATASOURCE_USERNAME=postgres",
        "QUARKUS_DATASOURCE_PASSWORD=postgres",
      ],
      db: postgresDb(),
    }
  }

  // Java MVC — traditional servlet container, typically MySQL
  if (backend.id === "java-mvc") {
    return {
      envVars: ["DB_URL=jdbc:mysql://db:3306/appdb", "DB_USER=root", "DB_PASSWORD=root"],
      db: mysqlDb(),
    }
  }

  // Spring Boot + Quartz — needs JDBC job store
  if (backend.id === "springboot-quartz") {
    return {
      envVars: [
        "SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/appdb",
        "SPRING_DATASOURCE_USERNAME=postgres",
        "SPRING_DATASOURCE_PASSWORD=postgres",
        "SPRING_QUARTZ_JOB_STORE_TYPE=jdbc",
        "SPRING_QUARTZ_PROPERTIES_ORG_QUARTZ_JOBSTORE_DRIVERDELEGATECLASS=org.quartz.impl.jdbcjobstore.PostgreSQLDelegate",
      ],
      db: postgresDb(),
    }
  }

  // Spring Boot (MyBatis, generic)
  return {
    envVars: [
      "SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/appdb",
      "SPRING_DATASOURCE_USERNAME=postgres",
      "SPRING_DATASOURCE_PASSWORD=postgres",
    ],
    db: postgresDb(),
  }
}

function generateDockerCompose(
  backend: TemplateItem | undefined,
  frontend: TemplateItem | undefined,
  composeInDeployments: boolean,
): string {
  const hasBoth = !!(backend && frontend)
  const lines: string[] = [`version: '3.8'`, "", "services:"]

  const backendProfile = backend ? getBackendProfile(backend) : null
  const hasDb = !!backendProfile?.db
  const needsNetwork = hasBoth || hasDb

  /* ── backend service ── */
  if (backend && backendProfile) {
    const ctx = composeInDeployments ? ".." : hasBoth ? "./backend" : "."
    lines.push(
      `  backend:`,
      `    build:`,
      `      context: ${ctx}`,
      `      dockerfile: Dockerfile`,
      `    ports:`,
      `      - "8080:8080"`,
    )
    if (backendProfile.envVars.length) {
      lines.push(`    environment:`)
      backendProfile.envVars.forEach((v) => lines.push(`      - ${v}`))
    }
    if (hasDb) {
      lines.push(`    depends_on:`, `      db:`, `        condition: service_healthy`)
    }
    if (needsNetwork) lines.push(`    networks:`, `      - app-network`)
    lines.push(`    restart: unless-stopped`)
  }

  /* ── frontend service ── */
  if (frontend) {
    if (backend) lines.push("")
    const ctx = hasBoth ? "./frontend" : "."
    const isAngular = frontend.badge === "Angular"
    // Angular production build is served by nginx on port 80
    const port = isAngular ? "80" : "3000"
    const expose = isAngular ? "80:80" : "3000:3000"

    lines.push(
      `  frontend:`,
      `    build:`,
      `      context: ${ctx}`,
      `      dockerfile: Dockerfile`,
      `    ports:`,
      `      - "${expose}"`,
    )

    const frontendEnv: string[] = []
    if (!isAngular) frontendEnv.push("NODE_ENV=production")
    if (hasBoth) frontendEnv.push("NEXT_PUBLIC_API_URL=http://backend:8080")

    if (frontendEnv.length) {
      lines.push(`    environment:`)
      frontendEnv.forEach((v) => lines.push(`      - ${v}`))
    }
    if (hasBoth) lines.push(`    depends_on:`, `      - backend`)
    if (needsNetwork) lines.push(`    networks:`, `      - app-network`)
    lines.push(`    restart: unless-stopped`)
  }

  /* ── db service ── */
  if (hasDb && backendProfile?.db) {
    lines.push("", ...backendProfile.db.serviceLines)
    if (needsNetwork) lines.push(`    networks:`, `      - app-network`)
  }

  /* ── networks ── */
  if (needsNetwork) {
    lines.push("", "networks:", "  app-network:", "    driver: bridge")
  }

  /* ── volumes ── */
  if (hasDb && backendProfile?.db?.volume) {
    lines.push("", "volumes:", `  ${backendProfile.db.volume}:`)
  }

  return lines.join("\n") + "\n"
}

/* ── public API ───────────────────────────────────────────────── */

export interface DownloadOptions {
  projectName: string
  groupId: string
  backend?: TemplateItem
  frontend?: TemplateItem
  isJavaBackend: boolean
  includeDocker?: boolean
  onProgress: (p: number) => void
}

export async function buildAndDownload(opts: DownloadOptions): Promise<void> {
  const { projectName, groupId, backend, frontend, isJavaBackend, includeDocker, onProgress } = opts
  const artifactId = sanitize(projectName)
  const hasBoth = !!(backend && frontend)
  const output = new JSZip()
  const root = output.folder(projectName)!

  /* ── backend ── */
  if (backend) {
    onProgress(5)
    const zip = await fetchZip(backend)
    onProgress(30)

    let files: FileMap

    if (isJavaBackend) {
      const oldPkg = await detectBasePackage(zip)
      const newPkg = `${groupId}.${artifactId}`

      files = await extractFiles(zip, {
        content: (text) => (oldPkg ? text.replaceAll(oldPkg, newPkg) : text),
        path: (p) => (oldPkg ? p.replaceAll(pkgToPath(oldPkg), pkgToPath(newPkg)) : p),
      })
    } else {
      files = await extractFiles(zip)
    }

    const dest = hasBoth ? root.folder("backend")! : root
    for (const [path, data] of Object.entries(files)) dest.file(path, data)

    onProgress(50)
  }

  /* ── frontend ── */
  if (frontend) {
    onProgress(55)
    const zip = await fetchZip(frontend)
    onProgress(75)

    const files = await extractFiles(zip, {
      content: (text, path) => {
        if (path === "package.json") {
          try {
            const pkg = JSON.parse(text)
            pkg.name = projectName
            return JSON.stringify(pkg, null, 2)
          } catch {
            return text
          }
        }
        return text
      },
    })

    const dest = hasBoth ? root.folder("frontend")! : root
    for (const [path, data] of Object.entries(files)) dest.file(path, data)

    onProgress(90)
  }

  /* ── docker-compose ── */
  if (includeDocker && (backend || frontend)) {
    // Go solo: standard project layout places deployment configs in deployments/
    const isGoOnly = !!(backend?.badge === "Go" && !frontend)
    const composeContent = generateDockerCompose(backend, frontend, isGoOnly)
    if (isGoOnly) {
      root.folder("deployments")!.file("docker-compose.yml", composeContent)
    } else {
      root.file("docker-compose.yml", composeContent)
    }
  }

  /* ── generate & trigger download ── */
  onProgress(95)
  const blob = await output.generateAsync({ type: "blob", compression: "DEFLATE" })
  onProgress(100)

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${projectName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
