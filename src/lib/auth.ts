import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'
import { syncGuestData } from './guest'
import type { AccountSession, User } from './types'

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

/** Only same-origin paths are allowed as post-login destinations (no `//host` or `https://` open redirects). */
export function safeRedirect(path: string | undefined, fallback = '/my-library') {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
  return path
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

  const signedOut = () => {
    queryClient.setQueryData(['user'], null)
    queryClient.removeQueries({ queryKey: ['me'] })
  }

  const login = useMutation({
    mutationFn: (data: { email: string; password: string; remember: boolean }) => api<User>('/login', { method: 'POST', body: data }),
    onSuccess: afterAuth,
  })

  const register = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
      api<User>('/register', { method: 'POST', body: data }),
    onSuccess: afterAuth,
  })

  const logout = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    onSuccess: signedOut,
  })

  const forgotPassword = useMutation({
    mutationFn: (data: { email: string }) => api<{ message: string }>('/forgot-password', { method: 'POST', body: data }),
  })

  const resetPassword = useMutation({
    mutationFn: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
      api<{ message: string }>('/reset-password', { method: 'POST', body: data }),
    onSuccess: signedOut,
  })

  return { login, register, logout, forgotPassword, resetPassword }
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, hash, expires, signature }: { id: string; hash: string; expires: string; signature: string }) =>
      api<{ message: string }>(`/email/verify/${encodeURIComponent(id)}/${encodeURIComponent(hash)}`, { query: { expires, signature } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
  })
}

export function useAccountSessions() {
  return useQuery({
    queryKey: ['me', 'sessions'],
    queryFn: () => api<{ data: AccountSession[] }>('/me/sessions').then((r) => r.data),
  })
}

export function useAccountActions() {
  const queryClient = useQueryClient()

  const updateProfile = useMutation({
    mutationFn: (data: { name: string; email: string; current_password?: string }) => api<User>('/me/profile', { method: 'PUT', body: data }),
    onSuccess: (user) => queryClient.setQueryData(['user'], user),
  })

  const updatePassword = useMutation({
    mutationFn: (data: { current_password: string; password: string; password_confirmation: string }) =>
      api('/me/password', { method: 'PUT', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] }),
  })

  const resendVerification = useMutation({
    mutationFn: () => api('/email/verification-notification', { method: 'POST' }),
  })

  const logoutOtherSessions = useMutation({
    mutationFn: (data: { password: string }) => api('/me/sessions/others', { method: 'DELETE', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] }),
  })

  // The caller clears the cached user once it has navigated away, so the page's auth guard doesn't redirect to login first.
  const deleteAccount = useMutation({
    mutationFn: (data: { password: string }) => api('/me/account', { method: 'DELETE', body: data }),
  })

  return { updateProfile, updatePassword, resendVerification, logoutOtherSessions, deleteAccount }
}
