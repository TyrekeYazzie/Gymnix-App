import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView as SafeAreaProvider,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <SafeAreaProvider style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join FitnessApp today</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#888888"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#888888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#ffffff" />
            : <Text style={styles.buttonText}>Sign Up</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888888', marginBottom: 40 },
  input: {
    backgroundColor: '#1a1a1a', color: '#ffffff',
    borderColor: '#2a2a2a', borderWidth: 1,
    borderRadius: 12, padding: 16, marginBottom: 16
  },
  button: {
    backgroundColor: '#ff4500', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  error: { color: 'red', marginBottom: 16 },
  link: { color: '#ff4500', textAlign: 'center', marginTop: 24 }
});