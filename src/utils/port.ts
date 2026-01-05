// src/utils/port.ts
import { createServer } from 'net'

export async function getRandomPort(minPort = 3000, maxPort = 9000): Promise<number> {
  const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort

  if (await isPortAvailable(port)) {
    return port
  }

  // If random port not available, find next available
  return findAvailablePort(minPort, maxPort)
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close()
      resolve(true)
    })

    server.listen(port, '127.0.0.1')
  })
}

async function findAvailablePort(minPort: number, maxPort: number): Promise<number> {
  for (let port = minPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  throw new Error(`No available port found between ${minPort} and ${maxPort}`)
}
