'use client';

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AuthError } from '@supabase/supabase-js'
import { Button } from './ui/button'

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { data, error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password)

      if (error) {
        setError((error as AuthError).message)
      } else {
        if (isLogin) {
          setSuccess('Login successful!')
          router.push('/') 
        } else {
          setSuccess('Account created successfully! Please confirm the registration email.')
          setIsLogin(true)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white font-mono">
            {isLogin ? 'AUTHORIZATION REQUIRED' : 'NEW RECRUIT REGISTRATION'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border-2 border-navy-600 bg-navy-800 placeholder-navy-400 text-white font-mono rounded-t-md focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 focus:z-10 text-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border-2 border-navy-600 bg-navy-800 placeholder-navy-400 text-white font-mono rounded-b-md focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 focus:z-10 text-sm"
                placeholder="Access Code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center font-mono bg-navy-800/50 p-2 rounded-md border border-red-500/50">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-400 text-sm text-center font-mono bg-navy-800/50 p-2 rounded-md border border-green-500/50">
              {success}
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-700 text-white hover:bg-navy-600 font-mono text-sm border-2 border-navy-600"
            >
              {loading ? 'PROCESSING...' : isLogin ? 'AUTHORIZE ACCESS' : 'REGISTER RECRUIT'}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-navy-300 hover:text-navy-200 font-mono transition-colors duration-200"
            >
              {isLogin
                ? "NEW RECRUIT? REGISTER HERE"
                : 'EXISTING OPERATIVE? AUTHORIZE HERE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}