import React from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  username: string;
  setUsername: (value: string) => void;
  pin: string;
  setPin: (value: string) => void;
  loading: boolean;
  error: string;
  onContinue: () => void;
};

export function LoginScreen({
  username,
  setUsername,
  pin,
  setPin,
  loading,
  error,
  onContinue,
}: Props) {
  const ready = username.trim().length > 0 && pin.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <Text
            style={{
              color: '#64748b',
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 1.5,
            }}
          >
            CABHQ DRIVER APP
          </Text>

          <Text
            style={{
              color: 'white',
              fontSize: 32,
              fontWeight: '900',
              marginTop: 10,
            }}
          >
            Driver Login
          </Text>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 15,
              marginTop: 10,
              lineHeight: 22,
            }}
          >
            Sign in with your username and PIN.
          </Text>

          <View style={{ marginTop: 24, gap: 14 }}>
            <View>
              <Text
                style={{
                  color: '#cbd5e1',
                  marginBottom: 8,
                  fontWeight: '700',
                }}
              >
                Username
              </Text>

              <TextInput
                value={username}
                onChangeText={(value) => setUsername(value.toLowerCase())}
                placeholder="Enter username"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: '#07111f',
                  color: 'white',
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              />
            </View>

            <View>
              <Text
                style={{
                  color: '#cbd5e1',
                  marginBottom: 8,
                  fontWeight: '700',
                }}
              >
                PIN
              </Text>

              <TextInput
                value={pin}
                onChangeText={setPin}
                placeholder="Enter PIN"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                secureTextEntry
                style={{
                  backgroundColor: '#07111f',
                  color: 'white',
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              />
            </View>
          </View>

          {error ? (
            <View
              style={{
                marginTop: 16,
                backgroundColor: '#3b0a0a',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: '#fecaca',
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={!ready || loading}
            onPress={onContinue}
            style={{
              marginTop: 22,
              backgroundColor:
                ready && !loading ? '#0891b2' : '#334155',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '900',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}