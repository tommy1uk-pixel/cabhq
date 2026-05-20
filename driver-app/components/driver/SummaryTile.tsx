import React from 'react';
import { Text, View } from 'react-native';

export function SummaryTile({
  label,
  value,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'green' | 'amber' | 'slate';
}) {
  const color = {
    cyan: '#67e8f9',
    green: '#6ee7b7',
    amber: '#fcd34d',
    slate: '#cbd5e1',
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#07111f',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1e293b',
      }}
    >
      <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800' }}>
        {label}
      </Text>

      <Text style={{ color, fontSize: 24, fontWeight: '900', marginTop: 8 }}>
        {value}
      </Text>
    </View>
  );
}