import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Field } from '@/components/ui';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';
type SignUpRole = 'passenger' | 'driver';

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [role, setRole] = useState<SignUpRole>('passenger');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'sign-in') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), role } },
        });
        if (err) throw err;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="mx-auto w-full max-w-md grow justify-center gap-5 p-6" keyboardShouldPersistTaps="handled">
          <View className="gap-1">
            <Text className="font-display text-5xl text-asphalt">Hail</Text>
            <Text className="subtitle">Rides when you need them.</Text>
          </View>

          {mode === 'sign-up' ? (
            <>
              <View className="flex-row gap-2">
                {(['passenger', 'driver'] as const).map((r) => (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: role === r }}
                    onPress={() => setRole(r)}
                    className={`flex-1 items-center py-3 ${role === r ? 'chip-active' : 'chip'}`}
                  >
                    <Text className={`font-body-medium ${role === r ? 'text-paper' : 'text-asphalt'}`}>
                      {r === 'passenger' ? 'I need rides' : 'I want to drive'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
            </>
          ) : null}

          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />

          {error ? <Banner tone="error">{error}</Banner> : null}
          {notice ? <Banner>{notice}</Banner> : null}

          <Button
            title={mode === 'sign-in' ? 'Sign in' : 'Create account'}
            loading={busy}
            disabled={!email || password.length < 6}
            onPress={submit}
          />
          <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="items-center py-2">
            <Text className="font-body-medium text-asphalt-soft">
              {mode === 'sign-in' ? 'New here? Create an account' : 'Have an account? Sign in'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
