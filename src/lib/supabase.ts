import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
if (!supabaseAnonKey) throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY");
if (!supabaseUrl.startsWith("https://")) throw new Error("Supabase URL must use HTTPS");

// expo-secure-store has no web implementation, so fall back to AsyncStorage
// there (only used by this project for browser-based dev preview/testing —
// native builds always use SecureStore).
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") { await AsyncStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") { await AsyncStorage.removeItem(key); return; }
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
    // PKCE puts the auth code in a plain ?code= query param, which is far
    // more reliable to capture from a deep link on RN than the implicit
    // flow's URL-fragment tokens. Required for the password-reset flow.
    flowType: "pkce",
  },
});