'use client';

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      // First, check if the user already exists
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('email')
        .eq('email', email)
        .single()
  
      if (existingUser) {
        return { 
          data: null, 
          error: new Error('This email is already registered. Please login or use another email.') 
        }
      }
  
      // If the user does not exist, create a new user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://chatbot-week-one.vercel.app/auth/callback',
          data: {
            email: email,
          },
        },
      })
  
      if (error) throw error
  
      return { 
        data, 
        error: null,
        message: 'Please confirm your email to complete registration.' 
      }
    } catch (error) {
      return { 
        data: null, 
        error 
      }
    }
  } 
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      router.push('/dashboard')
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }
} 