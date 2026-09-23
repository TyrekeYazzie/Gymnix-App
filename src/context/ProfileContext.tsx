import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Profile } from "@/types";

type ProfileContextType = {
  profile: Profile | null
  setProfile: (profile: Profile) => void
  refreshProfile: () => Promise<void>
  loading: boolean
  /** True when the last fetch failed — lets _layout tell "couldn't load" apart from "no profile yet" (needs onboarding). */
  loadFailed: boolean
  isImperial: boolean
}

export const ProfileContext = createContext<ProfileContextType | null>(null)

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth()
  // Keyed on the id, not the user object — onAuthStateChange hands back a new
  // object on every token refresh, which would otherwise refetch the profile
  // (and flash the loading screen) for no reason.
  const userId = user?.id
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const loadProfile = async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile:', error.message)
      // Keep whatever profile is already loaded: a failed background refresh
      // (e.g. after awarding XP) must not blank it out, since a null profile
      // reads as "never onboarded" and would bounce the user to onboarding.
      setLoadFailed(true)
      setLoading(false)
      return
    }

    setLoadFailed(false)
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    setLoadFailed(false)
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    // New account signed in: drop the previous one's profile and block on the
    // fetch, so _layout never routes on stale or empty data in between.
    setProfile(null)
    setLoading(true)
    loadProfile()
  }, [userId, authLoading])

  const refreshProfile = async () => { await loadProfile() }

  const isImperial = profile?.units === 'imperial'

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading, loadFailed, isImperial }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) throw new Error("useProfile must be used inside ProfileProvider")
  return context
}
