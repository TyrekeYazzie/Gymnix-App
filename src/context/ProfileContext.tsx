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

}

type ProfileContextType = {
    profile: Profile | null
    setProfile: (profile: Profile) => void
    loading: boolean
}

export const ProfileContext = createContext<ProfileContextType | null>(null)

export const ProfileProvider = ({ children } : {children: React.ReactNode }) => {
    const { user, loading: authLoading } = useAuth()
    const [profile, setProfile] = useState<Profile | null> (null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setProfile(null)
            setLoading(false)
            return
        }

        const loadProfile = async () => {
            const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        setProfile(data)
        setLoading(false)
        }

        loadProfile()
    }, [user, authLoading])

    return (
        <ProfileContext.Provider value={{ profile, setProfile, loading }}>
        {children}
        </ProfileContext.Provider>
    )
}

export const useProfile = () => {
    const context = useContext(ProfileContext)
    if (!context) throw new Error("User profile must be used iunside ProfileProvider")
        return context
}