'use client'

import { createContext, useContext } from 'react'

const AuthContext = createContext<{ isAdmin: boolean }>({ isAdmin: false })

export default function AuthProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean
  children: React.ReactNode
}) {

  return (
    <AuthContext.Provider value={{ isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
