'use client'

// Compatibility layer for workflow builder components
// This wraps the playground's auth provider to match the workflow builder's expected interface
import { useAuth as usePlaygroundAuth } from '@/components/providers/auth-provider'
import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email?: string) => Promise<void>
  checkAuth: () => Promise<void>
}

// For client-side usage, we'll use a simplified version
export function useAuth() {
  const playgroundAuth = usePlaygroundAuth()
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    // Try to get user info from token if available
    // In a real implementation, you'd decode the JWT or make an API call
    if (playgroundAuth.token && playgroundAuth.isAuthenticated) {
      // For now, we'll use a placeholder - you may want to decode the token
      // or make an API call to get user info
      setUser({
        id: 'user-id',
        email: 'user@example.com',
      })
    } else {
      setUser(null)
    }
  }, [playgroundAuth.token, playgroundAuth.isAuthenticated])
  
  return {
    user,
    isLoading: playgroundAuth.isLoading,
    login: async (email?: string) => {
      await playgroundAuth.login()
    },
    checkAuth: async () => {
      // Auth is handled by the playground's auth provider
    },
  }
}

