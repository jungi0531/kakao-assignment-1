import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
  localStorage.removeItem('my-tasks-todos')
  localStorage.removeItem('my-tasks-selected-date')
  localStorage.removeItem('my-tasks-week-start')
})
