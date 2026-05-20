import React from 'react';
import {
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { Badge } from './Badge';
import { PrimaryButton } from './PrimaryButton';

import type { Booking } from '@/lib/driver-types';

type Props = {
  offer: Booking;
  secondsRemaining: number;
  busyAction: string | null;
  onAcceptOffer: () => void;
  onRejectOffer: () => void;
};

export function IncomingOfferScreen({
  offer,
  secondsRemaining,
  busyAction,
  onAcceptOffer,
  onRejectOffer,
}: Props) {
  const urgent = secondsRemaining <= 5;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: '#111827',
            borderRadius: 30,
            padding: 22,
            borderWidth: 1,
            borderColor: urgent ? '#ef4444' : '#f59e0b',
          }}
        >
          <Text
            style={{
              color: urgent ? '#fecaca' : '#fcd34d',
              fontSize: 13,
              fontWeight: '900',
              letterSpacing: 2,
              textAlign: 'center',
            }}
          >
            NEW JOB OFFER
          </Text>

          <View
            style={{
              alignSelf: 'center',
              marginTop: 18,
              width: 118,
              height: 118,
              borderRadius: 999,
              borderWidth: 10,
              borderColor: urgent ? '#ef4444' : '#f59e0b',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 42,
                fontWeight: '900',
              }}
            >
              {secondsRemaining}
            </Text>

            <Text
              style={{
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              seconds
            </Text>
          </View>

          <Text
            style={{
              color: 'white',
              fontSize: 28,
              fontWeight: '900',
              marginTop: 22,
              textAlign: 'center',
            }}
          >
            {offer.reference}
          </Text>

          <Text
            style={{
              color: '#67e8f9',
              fontSize: 16,
              fontWeight: '800',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {offer.pickup}
          </Text>

          <View style={{ marginTop: 20, gap: 12 }}>
            <Badge label={offer.status} tone="amber" />

            <PrimaryButton
              label={
                busyAction === 'accept-offer'
                  ? 'Accepting...'
                  : 'ACCEPT JOB'
              }
              onPress={onAcceptOffer}
              disabled={busyAction !== null}
              color="#059669"
            />

            <PrimaryButton
              label={
                busyAction === 'reject-offer'
                  ? 'Rejecting...'
                  : 'REJECT'
              }
              onPress={onRejectOffer}
              disabled={busyAction !== null}
              color="#dc2626"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}