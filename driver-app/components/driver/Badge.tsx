import React from 'react';
import { Text, View } from 'react-native';

export type BadgeTone = 'green' | 'amber' | 'red' | 'cyan' | 'slate';

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const styles = {
    green: { backgroundColor: '#052e1b', color: '#6ee7b7' },
    amber: { backgroundColor: '#3b2305', color: '#fcd34d' },
    red: { backgroundColor: '#3b0a0a', color: '#fca5a5' },
    cyan: { backgroundColor: '#082f49', color: '#67e8f9' },
    slate: { backgroundColor: '#1e293b', color: '#cbd5e1' },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: styles.backgroundColor,
      }}
    >
      <Text style={{ color: styles.color, fontSize: 12, fontWeight: '800' }}>
        {label}
      </Text>
    </View>
  );
}