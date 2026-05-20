import React from 'react';
import { Text, View } from 'react-native';

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
      }}
    >
      <Text style={{ color: '#94a3b8', fontSize: 14 }}>{label}</Text>
      <Text
        style={{
          color: 'white',
          fontSize: 14,
          fontWeight: '700',
          flexShrink: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}