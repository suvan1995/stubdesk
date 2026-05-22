import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthState {
  user:    User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  signUp:  (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:    null,
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) return { error: error.message }
    if (data.user) {
      // Profile is created by a Supabase trigger (see migrations)
      await get().fetchProfile()
    }
    return { error: null }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        set({ loading: false })
        return { error: error.message }
      }
      // Fetch profile and wait for it to complete
      await get().fetchProfile()
      set({ loading: false })
      return { error: null }
    } catch (err) {
      set({ loading: false })
      return { error: 'An unexpected error occurred. Please try again.' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },

  fetchProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) {
        console.error('fetchProfile error:', error.message)
        return
      }
      if (data) set({ profile: data as Profile, user })
    } catch (err) {
      console.error('fetchProfile unexpected error:', err)
    }
  },
}))
