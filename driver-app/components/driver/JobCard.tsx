import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';

import type { Booking } from '@/lib/driver-types';
import { normalizeJobStatus } from '@/lib/driver-storage';

import { Badge } from './Badge';
import { PrimaryButton } from './PrimaryButton';

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

function formatDistance(value?: number | null) {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)} mi`;
}

function getGpsAgeLabel(seconds?: number | null) {
  if (seconds == null) return 'GPS pending';
  if (seconds < 60) return `${seconds}s old`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m old`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h old`;
}

function getEtaLabel(booking?: Booking | null) {
  if (!booking) return 'ETA pending';

  if (booking.etaMinutes != null) {
    if (booking.etaMinutes <= 1) return 'Arriving now';
    return `ETA ${booking.etaMinutes} mins`;
  }

  if (booking.driverDistanceMiles != null) {
    return `${booking.driverDistanceMiles.toFixed(1)} mi away`;
  }

  return 'ETA pending';
}

function getEtaTone(
  booking?: Booking | null,
): 'green' | 'amber' | 'red' | 'cyan' | 'slate' {
  if (!booking) return 'slate';

  const confidence = (booking.etaConfidence || '').toUpperCase();

  if (booking.etaMinutes != null && booking.etaMinutes <= 3) return 'green';
  if (confidence === 'LIVE_GPS') return 'cyan';
  if (confidence === 'ESTIMATED') return 'amber';
  if (confidence === 'UNAVAILABLE') return 'slate';

  return 'slate';
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

function getAirportDirectionLabel(value?: string | null) {
  const normalised = (value || '').toUpperCase();

  if (normalised === 'ARRIVAL') return 'Airport pickup';
  if (normalised === 'DEPARTURE') return 'Airport dropoff';
  if (normalised === 'TRANSFER') return 'Airport transfer';

  return normalised ? normalised.replace(/_/g, ' ') : 'Airport job';
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

function getJobActionConfig(status?: string | null) {
  const normalized = normalizeJobStatus(status);

  if (normalized === 'ACCEPTED') {
    return {
      endpoint: 'en-route',
      label: 'Mark En Route',
      busyKey: 'job-en-route',
      color: '#2563eb',
    };
  }

  if (normalized === 'EN_ROUTE') {
    return {
      endpoint: 'arrived',
      label: 'Mark Arrived',
      busyKey: 'job-arrived',
      color: '#7c3aed',
    };
  }

  if (normalized === 'ARRIVED') {
    return {
      endpoint: 'on-job',
      label: 'Passenger On Board',
      busyKey: 'job-on-job',
      color: '#0891b2',
    };
  }

  if (normalized === 'ON_JOB') {
    return {
      endpoint: 'complete',
      label: 'Complete Job',
      busyKey: 'job-complete',
      color: '#059669',
    };
  }

  return null;
}

async function openGoogleNavigation(
  address: string,
  lat?: number | null,
  lng?: number | null,
) {
  try {
    const destination =
      lat != null && lng != null
        ? `${lat},${lng}`
        : encodeURIComponent(address);

    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
    );
  } catch (error) {
    console.log('Failed to open Google Maps', error);
  }
}

async function openWazeNavigation(
  address: string,
  lat?: number | null,
  lng?: number | null,
) {
  try {
    const destination =
      lat != null && lng != null
        ? `${lat},${lng}`
        : encodeURIComponent(address);

    await Linking.openURL(`https://waze.com/ul?q=${destination}&navigate=yes`);
  } catch (error) {
    console.log('Failed to open Waze', error);
  }
}

async function openTrackingLink(job: Booking) {
  if (!job.trackingUrl) return;

  try {
    await Linking.openURL(job.trackingUrl);
  } catch (error) {
    console.log('Failed to open tracking link', error);
  }
}

async function shareTrackingMessage(job: Booking) {
  const message =
    job.customerTrackingMessage ||
    [
      `Booking ${job.reference}`,
      `Pickup: ${job.pickup}`,
      `Dropoff: ${job.dropoff}`,
      `Pickup time: ${formatDateTime(job.pickupTime)}`,
      job.etaMinutes != null ? `Driver ETA: approx ${job.etaMinutes} mins` : null,
      job.trackingUrl ? `Track live: ${job.trackingUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n');

  try {
    await Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
  } catch (error) {
    console.log('Failed to open tracking message', error);
  }
}

function TrackingMetaStrip({ job }: { job: Booking }) {
  const hasMeta =
    job.etaMinutes != null ||
    job.driverDistanceMiles != null ||
    job.etaConfidence ||
    job.driverGpsAgeSeconds != null ||
    job.trackingUrl;

  if (!hasMeta) return null;

  return (
    <View
      style={{
        marginTop: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <Badge label={getEtaLabel(job)} tone={getEtaTone(job)} />

      {job.driverDistanceMiles != null ? (
        <Badge
          label={`${formatDistance(job.driverDistanceMiles)} to pickup`}
          tone="cyan"
        />
      ) : null}

      {job.driverGpsAgeSeconds != null ? (
        <Badge
          label={`GPS ${getGpsAgeLabel(job.driverGpsAgeSeconds)}`}
          tone={job.driverGpsAgeSeconds <= 90 ? 'green' : 'amber'}
        />
      ) : null}

      {job.etaConfidence ? (
        <Badge
          label={job.etaConfidence.replace(/_/g, ' ')}
          tone={getEtaTone(job)}
        />
      ) : null}
    </View>
  );
}

function AirportJobStrip({ job }: { job: Booking }) {
  if (!isAirportBooking(job)) return null;

  return (
    <View
      style={{
        marginTop: 14,
        backgroundColor: '#082f49',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#075985',
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
          <Text style={{ color: '#67e8f9', fontSize: 12, fontWeight: '900' }}>
            {getAirportDirectionLabel(job.flightDirection).toUpperCase()}
          </Text>

          <Text
            style={{
              color: 'white',
              fontSize: 15,
              fontWeight: '900',
              marginTop: 5,
            }}
          >
            {getAirportSummary(job)}
          </Text>
        </View>

        {job.meetAndGreet ? <Badge label="MEET & GREET" tone="amber" /> : null}
      </View>

      {job.flightDateTime ? (
        <Text
          style={{
            color: '#bfdbfe',
            marginTop: 8,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          Flight time: {formatDateTime(job.flightDateTime)}
        </Text>
      ) : null}

      {job.airportNotes ? (
        <Text
          style={{
            color: '#dbeafe',
            marginTop: 8,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          {job.airportNotes}
        </Text>
      ) : null}
    </View>
  );
}

export function JobCard({
  job,
  busyAction,
  onJobAction,
}: {
  job: Booking;
  busyAction: string | null;
  onJobAction: (bookingId: string, endpoint: string, busyKey: string) => void;
}) {
  const actionConfig = getJobActionConfig(job.status);
  const status = normalizeJobStatus(job.status);
  const canNoShow = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(status);

  const statusTone =
    status === 'COMPLETED'
      ? 'green'
      : status === 'ON_JOB'
        ? 'amber'
        : status === 'CANCELLED' || status === 'NO_SHOW'
          ? 'red'
          : 'cyan';

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: status === 'ON_JOB' ? '#f59e0b' : '#1e293b',
        borderRadius: 22,
        padding: 16,
        backgroundColor: status === 'ON_JOB' ? '#1c1205' : '#07111f',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>
            {job.reference}
          </Text>

          <Text
            style={{
              color: '#67e8f9',
              fontSize: 13,
              marginTop: 5,
              fontWeight: '800',
            }}
          >
            Pickup: {formatDateTime(job.pickupTime)}
          </Text>
        </View>

        <Badge label={status.replace(/_/g, ' ')} tone={statusTone} />
      </View>

      <View style={{ marginTop: 16, gap: 12 }}>
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <Text style={{ color: '#93c5fd', fontSize: 12, fontWeight: '900' }}>
            PICKUP
          </Text>

          <Text
            style={{
              color: 'white',
              fontSize: 16,
              marginTop: 6,
              fontWeight: '800',
              lineHeight: 22,
            }}
          >
            {job.pickup || '—'}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <Text style={{ color: '#c4b5fd', fontSize: 12, fontWeight: '900' }}>
            DROPOFF
          </Text>

          <Text
            style={{
              color: 'white',
              fontSize: 16,
              marginTop: 6,
              fontWeight: '800',
              lineHeight: 22,
            }}
          >
            {job.dropoff || '—'}
          </Text>
        </View>
      </View>

      <TrackingMetaStrip job={job} />
      <AirportJobStrip job={job} />

      <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#0f172a',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '900' }}>
            FARE
          </Text>

          <Text
            style={{
              color: '#6ee7b7',
              fontSize: 22,
              fontWeight: '900',
              marginTop: 6,
            }}
          >
            {formatCurrency(getBookingPrice(job))}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: '#0f172a',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#1e293b',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '900' }}>
            PRICING
          </Text>

          <Text
            style={{
              color: 'white',
              fontSize: 16,
              fontWeight: '800',
              marginTop: 8,
            }}
          >
            {job.pricingMode || '—'}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() =>
              void openGoogleNavigation(
                job.pickup,
                job.pickupLat ?? job.pickupLatitude,
                job.pickupLng ?? job.pickupLongitude,
              )
            }
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#2563eb',
              backgroundColor: '#082f49',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#bfdbfe', fontWeight: '900', fontSize: 13 }}>
              Google Pickup
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              void openWazeNavigation(
                job.pickup,
                job.pickupLat ?? job.pickupLatitude,
                job.pickupLng ?? job.pickupLongitude,
              )
            }
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#f59e0b',
              backgroundColor: '#451a03',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fde68a', fontWeight: '900', fontSize: 13 }}>
              Waze Pickup
            </Text>
          </TouchableOpacity>
        </View>

        {['ON_JOB', 'ARRIVED'].includes(status) ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() =>
                void openGoogleNavigation(
                  job.dropoff,
                  job.dropoffLat ?? job.dropoffLatitude,
                  job.dropoffLng ?? job.dropoffLongitude,
                )
              }
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#7c3aed',
                backgroundColor: '#2e1065',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ddd6fe', fontWeight: '900', fontSize: 13 }}>
                Google Dropoff
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                void openWazeNavigation(
                  job.dropoff,
                  job.dropoffLat ?? job.dropoffLatitude,
                  job.dropoffLng ?? job.dropoffLongitude,
                )
              }
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#059669',
                backgroundColor: '#052e1b',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#a7f3d0', fontWeight: '900', fontSize: 13 }}>
                Waze Dropoff
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {job.trackingUrl || job.customerTrackingMessage ? (
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
          {job.trackingUrl ? (
            <TouchableOpacity
              onPress={() => void openTrackingLink(job)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#06b6d4',
                backgroundColor: '#083344',
                paddingVertical: 13,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#a5f3fc', fontWeight: '900', fontSize: 13 }}>
                Open Tracking
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => void shareTrackingMessage(job)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#10b981',
              backgroundColor: '#052e1b',
              paddingVertical: 13,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#a7f3d0', fontWeight: '900', fontSize: 13 }}>
              Send Update
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {actionConfig ? (
        <View style={{ marginTop: 14 }}>
          <PrimaryButton
            label={
              busyAction === `${actionConfig.busyKey}:${job.id}`
                ? `${actionConfig.label}...`
                : actionConfig.label
            }
            onPress={() =>
              onJobAction(job.id, actionConfig.endpoint, actionConfig.busyKey)
            }
            disabled={busyAction !== null}
            color={actionConfig.color}
          />
        </View>
      ) : null}

      {canNoShow ? (
        <View style={{ marginTop: 10 }}>
          <PrimaryButton
            label={
              busyAction === `job-no-show:${job.id}`
                ? 'Marking No Show...'
                : 'Passenger No Show'
            }
            onPress={() => onJobAction(job.id, 'no-show', 'job-no-show')}
            disabled={busyAction !== null}
            color="#dc2626"
          />
        </View>
      ) : null}
    </View>
  );
}