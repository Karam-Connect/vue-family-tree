// Prints the CHANGELOG.md section for a version, for the GitHub Release notes.
// Usage: node scripts/release-notes.mjs [version]   (default: package.json's version)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The body of `## [version]` in a Keep a Changelog file: everything up to the next `## ` heading or the link
 * references at the end, trimmed. Returns undefined if the version has no section or the section is empty.
 */
export const releaseNotes = (changelog, version) => {
  const lines = changelog.split(/\r?\n/)
  const start = lines.findIndex(line => line.startsWith(`## [${version}]`))
  if (start === -1) return undefined
  const rest = lines.slice(start + 1)
  const end = rest.findIndex(line => line.startsWith('## ') || /^\[[^\]]+\]: /.test(line))
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim()
  return body || undefined
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url)
  const version = process.argv[2] ?? JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).version
  const notes = releaseNotes(readFileSync(new URL('CHANGELOG.md', root), 'utf8'), version)
  if (!notes) {
    console.error(`CHANGELOG.md has no notes for ${version}: add a "## [${version}] - YYYY-MM-DD" section`)
    process.exit(1)
  }
  console.log(notes)
}
