#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cloudRoot = resolve(repositoryRoot, 'apps/cloud')
const webRoot = resolve(repositoryRoot, 'apps/web')
const viteArguments = {
  cloud: ['--host', 'localhost', '--port', '5174', '--strictPort'],
  web: ['--mode', 'cloud', '--host', 'localhost', '--port', '5173', '--strictPort'],
}

function usage() {
  return [
    'Usage: pnpm dev:cloud-proxy',
    'Enter the Cloud Console and Cluster HTTPS origins at the terminal prompts.',
    'For non-interactive use, pass --cloud-origin and --cluster-origin.',
    'Origins must not include a path, query, fragment, or credentials.',
  ].join('\n')
}

function parseArguments(args) {
  const options = { cloudOrigin: undefined, clusterOrigin: undefined, help: false }
  const values = args[0] === '--' ? args.slice(1) : args

  for (let index = 0; index < values.length; index += 1) {
    const option = values[index]
    if (option === '--help' || option === '-h') {
      options.help = true
      continue
    }

    const value = values[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`)
    if (option === '--cloud-origin') {
      if (options.cloudOrigin) throw new Error('--cloud-origin can only be supplied once.')
      options.cloudOrigin = value
    } else if (option === '--cluster-origin') {
      if (options.clusterOrigin) throw new Error('--cluster-origin can only be supplied once.')
      options.clusterOrigin = value
    } else {
      throw new Error(`Unknown option: ${option}`)
    }
    index += 1
  }

  return options
}

function validateOrigin(value, option) {
  const input = value.trim()
  let url
  try {
    url = new URL(input)
  } catch {
    throw new Error(`${option} must be a valid HTTPS origin.`)
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (input !== url.origin && input !== `${url.origin}/`)
  ) {
    throw new Error(
      `${option} must be an HTTPS origin without credentials, path, query, or fragment.`,
    )
  }

  return url.origin
}

async function promptForOrigins(options) {
  if (options.cloudOrigin && options.clusterOrigin) return options
  if (!process.stdin.isTTY) {
    throw new Error(`Supply both origins in non-interactive mode.\n${usage()}`)
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    if (!options.cloudOrigin) {
      options.cloudOrigin = await new Promise((resolveAnswer) =>
        prompt.question('Cloud Console HTTPS origin: ', resolveAnswer),
      )
    }
    if (!options.clusterOrigin) {
      options.clusterOrigin = await new Promise((resolveAnswer) =>
        prompt.question('Cluster HTTPS origin: ', resolveAnswer),
      )
    }
  } finally {
    prompt.close()
  }
  return options
}

function safeParentEnvironment() {
  const keys = [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'TMPDIR',
    'TMP',
    'TEMP',
    'LANG',
    'LC_ALL',
    'TERM',
    'SYSTEMROOT',
    'WINDIR',
    'APPDATA',
    'LOCALAPPDATA',
    'USERPROFILE',
    'PATHEXT',
    'COMSPEC',
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'no_proxy',
    'NODE_EXTRA_CA_CERTS',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
  ]
  return Object.fromEntries(
    keys.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])),
  )
}

function redactLogLine(line) {
  return line
    .replace(/([?&][^=&#\s]+=)[^&#\s]*/g, '$1[redacted]')
    .replace(/(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi, '$1[redacted]')
    .replace(/(set-cookie|cookie):[^\r\n]*/gi, '$1: [redacted]')
}

function forwardRedactedOutput(stream, label) {
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  lines.on('line', (line) => process.stdout.write(`[${label}] ${redactLogLine(line)}\n`))
}

function startVite({ appRoot, label, args, env }) {
  const entry = resolve(appRoot, 'node_modules/vite/bin/vite.js')
  if (!existsSync(entry))
    throw new Error(`Vite is not installed for ${label}. Run pnpm install first.`)

  const filter = label === 'cloud' ? 'cloud' : 'web'
  const child = spawn('pnpm', ['--filter', filter, 'exec', 'vite', ...args], {
    cwd: repositoryRoot,
    detached: process.platform !== 'win32',
    env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  forwardRedactedOutput(child.stdout, label)
  forwardRedactedOutput(child.stderr, label)
  return child
}

function stopProcess(child, signal) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    const taskkill = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    taskkill.on('error', () => child.kill(signal))
    return
  }

  try {
    process.kill(-child.pid, signal)
  } catch {
    child.kill(signal)
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }

  await promptForOrigins(options)
  const cloudOrigin = validateOrigin(options.cloudOrigin, '--cloud-origin')
  const clusterOrigin = validateOrigin(options.clusterOrigin, '--cluster-origin')
  const envDir = mkdtempSync(join(tmpdir(), 'tapstate-cloud-proxy-'))
  try {
    chmodSync(envDir, 0o700)
  } catch {
    // Windows does not apply POSIX directory modes.
  }

  const baseEnvironment = {
    ...safeParentEnvironment(),
    PWD: repositoryRoot,
    TAPSTATE_LOCAL_PREVIEW_ENV_DIR: envDir,
  }
  const children = []
  const exited = new Set()
  let stopping = false
  let cleaned = false
  let exitCode = 0

  function cleanupIfDone() {
    if (!stopping || cleaned || exited.size !== children.length) return
    cleaned = true
    rmSync(envDir, { recursive: true, force: true })
    process.exitCode = exitCode
  }

  function stopAll(signal, nextExitCode) {
    if (stopping) return
    stopping = true
    exitCode = nextExitCode
    for (const child of children) stopProcess(child, signal)
    cleanupIfDone()
  }

  function launch(label, appRoot, args, appEnvironment) {
    if (stopping) return
    let child
    try {
      child = startVite({
        appRoot,
        label,
        args,
        env: { ...baseEnvironment, ...appEnvironment },
      })
    } catch (error) {
      process.stderr.write(`[${label}] ${error.message}\n`)
      stopAll('SIGTERM', 1)
      return
    }

    children.push(child)
    child.once('error', (error) => {
      process.stderr.write(`[${label}] Could not start Vite (${error.code ?? 'spawn error'}).\n`)
      exited.add(child)
      stopAll('SIGTERM', 1)
      cleanupIfDone()
    })
    child.once('exit', (code, signal) => {
      exited.add(child)
      if (!stopping) {
        process.stderr.write(`[${label}] stopped (${signal ?? code}). Stopping the other server.\n`)
        stopAll('SIGTERM', code ?? 1)
      }
      cleanupIfDone()
    })
  }

  process.once('SIGINT', () => stopAll('SIGTERM', 130))
  process.once('SIGTERM', () => stopAll('SIGTERM', 143))

  process.stdout.write('Cloud API proxy target configured.\n')
  process.stdout.write('Cluster API proxy target configured.\n')
  process.stdout.write(
    'Browser API requests go to these explicit targets; write actions affect the selected Cluster.\n',
  )
  process.stdout.write('Local Cloud Console: http://localhost:5174/auth\n')
  process.stdout.write('Local Cluster Console: http://localhost:5173/overview\n')
  process.stdout.write(
    'Repository dotenv files are isolated; the launcher uploads no local files. Press Ctrl+C to stop both Vite servers.\n',
  )

  launch('cloud', cloudRoot, viteArguments.cloud, {
    CLOUD_PROXY_TARGET: cloudOrigin,
    VITE_LOCAL_CLUSTER_PROXY_ORIGIN: clusterOrigin,
  })
  launch('web', webRoot, viteArguments.web, {
    TAPSTATE_LOCAL_DEVELOPMENT: 'true',
    VITE_CLOUD_CONSOLE_URL: 'http://localhost:5174',
    VITE_PROXY_TARGET: clusterOrigin,
  })
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n${usage()}\n`)
  process.exitCode = 2
})
