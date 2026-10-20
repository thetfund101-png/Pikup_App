import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button } from '@/components/ui';
import { useAuth } from './AuthProvider';

export default function ProfileScreen() {
  const { session, profile, signOut } = useAuth();
  return (
    <SafeAreaView className="screen">
      <View className="gap-4 p-5">
        <Text className="title">{profile?.full_name || 'Your account'}</Text>
        <View className="card gap-1">
          <Text className="label">Email</Text>
          <Text className="font-body text-base text-asphalt">{session?.user.email ?? 'Not set'}</Text>
          <Text className="label mt-3">Role</Text>
          <Text className="font-body text-base capitalize text-asphalt">{profile?.role}</Text>
        </View>
        {profile?.role === 'driver' && !profile.is_approved ? (
          <Banner>Your driver account is waiting for approval. You can go online once it is approved.</Banner>
        ) : null}
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}
