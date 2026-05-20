import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  color = '#0891b2',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#334155' : color,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}