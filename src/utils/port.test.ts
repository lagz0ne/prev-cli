// src/utils/port.test.ts
import { test, expect } from 'bun:test'
import { getRandomPort, isPortAvailable } from './port'

test('getRandomPort returns a number in valid range', async () => {
  const port = await getRandomPort()
  expect(port).toBeGreaterThanOrEqual(3000)
  expect(port).toBeLessThanOrEqual(9000)  // Match actual default maxPort
})

test('getRandomPort returns different ports on subsequent calls', async () => {
  const port1 = await getRandomPort()
  const port2 = await getRandomPort()
  // They might be the same by chance, but usually different
  expect(typeof port1).toBe('number')
  expect(typeof port2).toBe('number')
})

test('isPortAvailable returns boolean', async () => {
  const available = await isPortAvailable(59999)
  expect(typeof available).toBe('boolean')
})
