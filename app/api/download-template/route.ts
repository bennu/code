import { NextRequest, NextResponse } from "next/server"
import { GITHUB_OWNER } from "@/lib/templates"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const repo = searchParams.get("repo")
  const branch = searchParams.get("branch")

  if (!repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 })
  }

  // Only append branch when it's not the default (handles main/master differences across repos)
  const url =
    branch && branch !== "main"
      ? `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/zipball/${branch}`
      : `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/zipball`

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "bennu-code",
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: `GitHub returned ${res.status}` }, { status: res.status })
  }

  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: { "Content-Type": "application/zip" },
  })
}
