import { tool } from '@opencode-ai/plugin'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export default tool({
  description: 'Execute TypeScript code and return the output',
  args: {
    code: tool.schema.string().describe('TypeScript code to execute'),
  },
  async execute(args) {
    return executeCode(args.code)
  },
})

function executeCode(code: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const envPath = join(process.cwd(), '.env')
    const TIMEOUT_MS = 30000 // 30 seconds

    const args = [
      '-e',
      code,
      // '-i', // auto-install missing dependencies when running code via bun https://bun.com/docs/runtime#param-i
    ]

    if (existsSync(envPath)) {
      args.unshift('--env-file', envPath)
    }

    // Use opencode's executable path and BUN_BE_BUN=1 to run it as Bun
    const bunProcess = spawn(process.execPath, args, {
      env: {
        ...process.env,
        BUN_BE_BUN: '1', // https://bun.com/docs/bundler/executables#act-as-the-bun-cli
      },
      killSignal: 'SIGTERM',
    })

    let stdout = ''
    let stderr = ''
    let isResolved = false

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        bunProcess.kill('SIGTERM')

        // Force kill if process doesn't terminate
        setTimeout(() => {
          if (bunProcess.exitCode === null) {
            bunProcess.kill('SIGKILL')
          }
        }, 5000)

        resolve(`Execution timed out after ${TIMEOUT_MS / 1000} seconds`)
      }
    }, TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timeoutId)
      bunProcess.stdout.removeAllListeners()
      bunProcess.stderr.removeAllListeners()
      bunProcess.removeAllListeners()
    }

    bunProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    bunProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    bunProcess.on('close', (code) => {
      if (isResolved) {
        return
      }

      isResolved = true
      cleanup()

      if (code === 0) {
        resolve(stdout)
        return
      }

      // Return error output on failure
      if (stderr && stdout) {
        resolve(`Error (exit code ${code}):\n${stderr}\n\nOutput:\n${stdout}`)
        return
      }

      resolve(stderr || stdout || `Command failed with exit code ${code}`)
    })

    bunProcess.on('error', (error) => {
      if (isResolved) {
        return
      }

      isResolved = true
      cleanup()
      resolve(`Execution error: ${error.message}`)
    })
  })
}
