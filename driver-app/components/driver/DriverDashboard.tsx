import React, { useMemo } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Booking, Driver } from '@/lib/driver-types';

import { Badge } from './Badge';
import { CompletedJobCard } from './CompletedJobCard';
import { DetailRow } from './DetailRow';
import { IncomingOfferScreen } from './IncomingOfferScreen';
import { JobCard } from './JobCard';
import { PrimaryButton } from './PrimaryButton';
import { SectionCard } from './SectionCard';
import { SummaryTile } from './SummaryTile';

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

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return `£${Number(value).toFixed(2)}`;
}

function formatMinutes(value?: number | null) {
  if (value == null) return '—';

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
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

type Props = {
  backendUrl: string;
  driver: Driver;
  activeOffer: Booking | null;
  activeJobs: Booking[];
  completedJobs: Booking[];
  refreshing: boolean;
  busyAction: string | null;
  locationEnabled: boolean;
  locationStatus: string;
  offerSecondsRemaining: number;
  onRefresh: () => void;
  onStartShift: () => void;
  onEndShift: () => void;
  onAcceptOffer: () => void;
  onRejectOffer: () => void;
  onJobAction: (bookingId: string, endpoint: string, busyKey: string) => void;
  onDisconnect: () => void;
  onTestAlert: () => void;
  onSendCurrentGps: () => void;
  onGoOnline: () => void;
};

export function DriverDashboard({
  backendUrl,
  driver,
  activeOffer,
  activeJobs,
  completedJobs,
  refreshing,
  busyAction,
  locationEnabled,
  locationStatus,
  offerSecondsRemaining,
  onRefresh,
  onStartShift,
  onEndShift,
  onAcceptOffer,
  onRejectOffer,
  onJobAction,
  onDisconnect,
  onTestAlert,
  onSendCurrentGps,
  onGoOnline,
}: Props) {
  const blockedReasons = driver.dispatch?.blockedReasons ?? [];
  const onShift = Boolean(driver.shift?.active);
  const driverStatus = (driver.status || 'UNKNOWN').toUpperCase();
  const isOnlineStatus = ['ONLINE', 'AVAILABLE', 'ON_DUTY'].includes(driverStatus);

  const hasGps = Boolean(
    driver.latitude != null &&
      driver.longitude != null &&
      driver.lastLocationAt,
  );

  const completedTotal = completedJobs.reduce((sum, job: any) => {
    const price =
      job.quotedPrice ??
      job.pricing?.quotedPrice ??
      job.fare ??
      job.price ??
      0;

    return sum + Number(price || 0);
  }, 0);

  const completedCount =
    completedJobs.length || driver.shift?.summary?.completedJobs || 0;

  const airportActiveJobs = activeJobs.filter(isAirportBooking).length;
  const liveEtaJobs = activeJobs.filter((job) => job.etaMinutes != null).length;

  const complianceTone = useMemo(() => {
    if (driver.compliance?.overallStatus === 'EXPIRED') return 'red' as const;
    if (driver.compliance?.overallStatus === 'EXPIRING') return 'amber' as const;
    return 'green' as const;
  }, [driver.compliance?.overallStatus]);

  if (activeOffer) {
    return (
      <IncomingOfferScreen
        offer={activeOffer}
        secondsRemaining={offerSecondsRemaining}
        busyAction={busyAction}
        onAcceptOffer={onAcceptOffer}
        onRejectOffer={onRejectOffer}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: '#1e293b',
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
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }}>
                DRIVER APP
              </Text>

              <Text
                style={{
                  color: 'white',
                  fontSize: 28,
                  fontWeight: '900',
                  marginTop: 6,
                }}
              >
                {driver.name || 'Driver'}
              </Text>

              <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>
                {driver.username
                  ? `@${driver.username}`
                  : driver.email || driver.phone || 'No contact details'}
              </Text>

              <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                {backendUrl}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onDisconnect}
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '800' }}>
                Disconnect
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 16,
            }}
          >
            <Badge label={onShift ? 'ON SHIFT' : 'OFF SHIFT'} tone={onShift ? 'cyan' : 'slate'} />

            <Badge
              label={driverStatus.replace('_', ' ')}
              tone={
                isOnlineStatus
                  ? 'green'
                  : driverStatus === 'BUSY' || driverStatus === 'OFFERED'
                    ? 'cyan'
                    : 'amber'
              }
            />

            <Badge label={hasGps ? 'GPS LIVE' : 'NO GPS'} tone={hasGps ? 'green' : 'red'} />

            <Badge
              label={driver.compliance?.overallStatus || 'VALID'}
              tone={complianceTone}
            />

            <Badge
              label={
                driver.dispatch?.assignable === false
                  ? 'DISPATCH BLOCKED'
                  : 'DISPATCH READY'
              }
              tone={driver.dispatch?.assignable === false ? 'red' : 'green'}
            />
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            <PrimaryButton
              label="Test Alert Sound"
              onPress={onTestAlert}
              disabled={busyAction !== null}
              color="#7c3aed"
            />

            <PrimaryButton
              label={busyAction === 'go-online' ? 'Going Online...' : 'Go Online Now'}
              onPress={onGoOnline}
              disabled={busyAction !== null}
              color="#0891b2"
            />

            <PrimaryButton
              label={busyAction === 'gps-now' ? 'Sending GPS...' : 'Send Current GPS Now'}
              onPress={onSendCurrentGps}
              disabled={busyAction !== null}
              color="#059669"
            />
          </View>
        </View>

        <SectionCard title="Today Summary">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <SummaryTile label="Earnings" value={formatCurrency(completedTotal)} tone="green" />
            <SummaryTile label="Completed" value={String(completedCount)} tone="cyan" />
            <SummaryTile label="Active Jobs" value={String(activeJobs.length)} tone="amber" />
            <SummaryTile label="Airport Jobs" value={String(airportActiveJobs)} tone="cyan" />
            <SummaryTile label="Live ETAs" value={String(liveEtaJobs)} tone="green" />
            <SummaryTile
              label="Shift Time"
              value={formatMinutes(driver.shift?.durationMinutes ?? null)}
              tone="slate"
            />
          </View>
        </SectionCard>

        <SectionCard title="Shift">
          <DetailRow label="Status" value={onShift ? 'On shift' : 'Off shift'} />
          <DetailRow label="Driver Status" value={driverStatus} />
          <DetailRow
            label="Started"
            value={driver.shift?.startedAt ? formatDateTime(driver.shift.startedAt) : '—'}
          />
          <DetailRow
            label="Completed Jobs"
            value={String(driver.shift?.summary?.completedJobs ?? 0)}
          />
          <DetailRow
            label="Active Jobs"
            value={String(driver.shift?.summary?.activeJobs ?? 0)}
          />
          <DetailRow
            label="Shift Time"
            value={formatMinutes(driver.shift?.durationMinutes ?? null)}
          />

          <View style={{ marginTop: 14 }}>
            {!onShift ? (
              <PrimaryButton
                label={
                  busyAction === 'start-shift'
                    ? 'Starting shift...'
                    : 'Start Shift / Go Online'
                }
                onPress={onStartShift}
                disabled={busyAction !== null}
                color="#059669"
              />
            ) : (
              <PrimaryButton
                label={busyAction === 'end-shift' ? 'Ending shift...' : 'End Shift'}
                onPress={onEndShift}
                disabled={busyAction !== null}
                color="#d97706"
              />
            )}
          </View>
        </SectionCard>

        <SectionCard title="Dispatch Status">
          <DetailRow
            label="Assignable"
            value={driver.dispatch?.assignable === false ? 'No' : 'Yes'}
          />
          <DetailRow
            label="Compliance"
            value={driver.compliance?.overallStatus || 'VALID'}
          />
          <DetailRow
            label="Location Tracking"
            value={locationEnabled ? 'Active' : 'Inactive'}
          />
          <DetailRow
            label="Last GPS Update"
            value={formatDateTime(driver.lastLocationAt)}
          />
          <DetailRow
            label="Coordinates"
            value={
              driver.latitude != null && driver.longitude != null
                ? `${driver.latitude.toFixed(5)}, ${driver.longitude.toFixed(5)}`
                : '—'
            }
          />

          {locationStatus ? (
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 10 }}>
              {locationStatus}
            </Text>
          ) : null}

          {blockedReasons.length > 0 ? (
            <View
              style={{
                marginTop: 14,
                backgroundColor: '#3b0a0a',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: '#fecaca',
                  fontSize: 12,
                  fontWeight: '900',
                  marginBottom: 8,
                }}
              >
                BLOCKED REASONS
              </Text>

              {blockedReasons.map((reason) => (
                <Text
                  key={reason}
                  style={{
                    color: '#fee2e2',
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  • {reason}
                </Text>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Current Jobs"
          right={<Badge label={`${activeJobs.length} ACTIVE`} tone="cyan" />}
        >
          {activeJobs.length === 0 ? (
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>
              No active jobs.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {activeJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  busyAction={busyAction}
                  onJobAction={onJobAction}
                />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title="Completed Jobs"
          right={<Badge label={`${completedJobs.length} DONE`} tone="green" />}
        >
          {completedJobs.length === 0 ? (
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>
              No completed jobs yet.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {completedJobs.slice(0, 10).map((job) => (
                <CompletedJobCard key={job.id} job={job} />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Driver Profile">
          <DetailRow label="Licence Number" value={driver.licenceNumber || '—'} />
          <DetailRow label="Taxi Badge Expiry" value={formatDate(driver.badgeExpiry)} />
          <DetailRow label="DBS Expiry" value={formatDate(driver.dbsExpiry)} />
          <DetailRow label="Licence Expiry" value={formatDate(driver.licenceExpiry)} />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}