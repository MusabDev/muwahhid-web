import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'
import { syncGuestData } from './guest'
import type { User } from './types'

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await api<User>('/user')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: Infinity,
    retry: false,
  })
}

export function useAuthActions() {
  const queryClient = useQueryClient()

  const afterAuth = async (user: User) => {
    queryClient.setQueryData(['user'], user)
    try {
      await syncGuestData()
    } catch {
      /* guest data stays in localStorage and is retried next login */
    }
    await queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  const login = useMutation({
    mutationFn: (data: { email: string; password: string }) => api<User>('/login', { method: 'POST', body: data }),
    onSuccess: afterAuth,
  })

  const register = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
      api<User>('/register', { method: 'POST', body: data }),
    onSuccess: afterAuth,
  })

  const logout = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(['user'], null)
      queryClient.removeQueries({ queryKey: ['me'] })
    },
  })

  return { login, register, logout }
}
