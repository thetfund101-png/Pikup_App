import { useEffect, useState } from 'react';
import { Linking, Pressable, Text } from 'react-native';
import { toMessage } from '@/lib/errors';
import { useAuth } from '@/features/auth/AuthProvider';
import type { LatLng } from '@/types/domain';
import { sendSos } from '../api';

const EMERGENCY_NUMBER = process.env.EXPO_PUBLIC_EMERGENCY_NUMBER;

/** Two taps to confirm (Alert.alert doesn't exist on web). Records the event for admins, then offers to dial. */
export function SosButton({ rideId, at }: { rideId: string | null; at: LatLng | null }) {
  const { session } = useAuth();
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  const press = async () => {
    if (!armed) return setArmed(true);
    if (!session) return;
    setArmed(false);
    setState('sending');
    try {
      await sendSos(session.user.id, rideId, at);
      setState('sent');
      setMessage('Alert sent to the Hail safety team.');
      if (EMERGENCY_NUMBER) await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
    } catch (e) {
      setState('error');
      setMessage(`Couldn't send the alert: ${toMessage(e)}`);
      if (EMERGENCY_NUMBER) await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS"
        onPress={press}
        disabled={state === 'sending'}
        className={`h-12 items-center justify-center rounded-2xl ${armed ? 'bg-alert' : 'border border-alert bg-white'}`}
      >
        <Text className={`font-heading ${armed ? 'text-white' : 'text-alert'}`}>
          {armed ? 'Tap again to send SOS' : state === 'sending' ? 'Sending…' : 'SOS'}
        </Text>
      </Pressable>
      {message ? <Text className={`font-body text-sm ${state === 'error' ? 'text-alert' : 'text-go'}`}>{message}</Text> : null}
    </>
  );
}
