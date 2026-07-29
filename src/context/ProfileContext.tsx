import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Profile } from "@/types";

type ProfileContextType = {
  profile: Profile | null
  setProfile: (profile: Profile) => void
  refreshProfile: () => Promise<void>
  loading: boolean
  isImperial: boolean
}

export const ProfileContext = createContext<ProfileContextType | null>(null)

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile:', error.message)
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    loadProfile()
  }, [user, authLoading])

  const refreshProfile = async () => { await loadProfile() }

  const isImperial = profile?.units === 'imperial'

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading, isImperial }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) throw new Error("useProfile must be used inside ProfileProvider")
  return context
}