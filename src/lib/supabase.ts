import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
if (!supabaseAnonKey) throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY");
if (!supabaseUrl.startsWith("https://")) throw new Error("Supabase URL must use HTTPS");

const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Encrypts session tokens on device instead of plain AsyncStorage
    storage: secureStorage,
    // Automatically refreshes token before it expires
    autoRefreshToken: true,
    // Saves session so user stays logged in after app restart
    persistSession: true,
    // Not needed for React Native apps
    detectSessionInUrl: false,
  },
});