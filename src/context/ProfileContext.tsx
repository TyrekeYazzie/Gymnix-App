import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Profile = {
  id: string
  full_name: string | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  goal: string | null
  activity_level: string | null
  units: 'metric' | 'imperial'
}

type ProfileContextType = {
  profile: Profile | null
  setProfile: (profile: Profile) => void
  loading: boolean
  isImperial: boolean   // convenience boolean every screen can use
}

export const ProfileContext = createContext<ProfileContextType | null>(null)

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const loadProfile = async () => {
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

    loadProfile()
  }, [user, authLoading])

  const isImperial = profile?.units === 'imperial'

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading, isImperial }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) throw new Error("useProfile must be used inside ProfileProvider")
  return context
}