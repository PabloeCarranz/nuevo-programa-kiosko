import { apiFetch } from './client'

export function checkHealth() {
  return apiFetch<{ status: string }>('/health')
}
