'use client'

import { createContext, useContext, useState } from 'react'

type AuthContextType = {
  isAdmin: boolean
  toggleAdmin: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  toggleAdmin: () => {},
})

export default function AuthProvider({
  isAdmin: initialIsAdmin,
  children,
}: {
  isAdmin: boolean
  children: React.ReactNode
}) {
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)

  const toggleAdmin = () => {
    setIsAdmin(prev => !prev)
  }

  return (
    <AuthContext.Provider value={{ isAdmin, toggleAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

/*
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
*/