import React from 'react';
import { Text, View } from 'react-native';

import type { Booking } from '@/lib/driver-types';

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return `£${Number(value).toFixed(2)}`;
}

function getBookingPrice(booking?: Booking | any) {
  return (
    booking?.quotedPrice ??
    booking?.pricing?.quotedPrice ??
    booking?.fare ??
    booking?.price ??
    null
  );
}

function isAirportBooking(job?: Booking | null) {
  return Boolean(
    job?.isAirportBooking ||
      job?.airportCode ||
      job?.airportName ||
      job?.airportTerminal ||
      job?.flightNumber ||
      job?.flightDirection ||
      job?.flightDateTime ||
      job?.airline ||
      job?.meetAndGreet ||
      job?.airportNotes,
  );
}

function getAirportSummary(job: Booking) {
  const parts = [
    job.airportName || job.airportCode,
    job.airportTerminal,
    job.flightNumber ? `Flight ${job.flightNumber}` : null,
    job.airline,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Airport booking';
}

export function CompletedJobCard({ job }: { job: Booking }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#064e3b',
        borderRadius: 16,
        padding: 14,
        backgroundColor: '#052e1b',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 15, fontWeight: '800' }}>
            {job.reference}
          </Text>

          <Text style={{ color: '#a7f3d0', fontSize: 12, marginTop: 4 }}>
            {formatDateTime(job.pickupTime)}
          </Text>
        </View>

        <Text style={{ color: '#6ee7b7', fontSize: 16, fontWeight: '900' }}>
          {formatCurrency(getBookingPrice(job))}
        </Text>
      </View>

      <Text style={{ color: '#d1fae5', fontSize: 13, marginTop: 10 }}>
        {job.pickup}
      </Text>

      <Text style={{ color: '#a7f3d0', fontSize: 13, marginTop: 4 }}>
        → {job.dropoff}
      </Text>

      {isAirportBooking(job) ? (
        <Text
          style={{
            color: '#67e8f9',
            fontSize: 12,
            marginTop: 8,
            fontWeight: '800',
          }}
        >
          {getAirportSummary(job)}
        </Text>
      ) : null}
    </View>
  );
}