import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { Booking, Driver } from '@/lib/driver-types';

type Props = {
  driver: Driver | null;
  activeJobs: Booking[];
};

export function DriverLiveMap({ driver, activeJobs }: Props) {
  const activeJob = activeJobs[0];

  const driverCoords = useMemo(() => {
    if (
      driver?.latitude == null ||
      driver?.longitude == null
    ) {
      return null;
    }

    return {
      latitude: driver.latitude,
      longitude: driver.longitude,
    };
  }, [driver]);

  const pickupCoords = useMemo(() => {
    if (
      activeJob?.pickupLat == null ||
      activeJob?.pickupLng == null
    ) {
      return null;
    }

    return {
      latitude: activeJob.pickupLat,
      longitude: activeJob.pickupLng,
    };
  }, [activeJob]);

  const dropoffCoords = useMemo(() => {
    if (
      activeJob?.dropoffLat == null ||
      activeJob?.dropoffLng == null
    ) {
      return null;
    }

    return {
      latitude: activeJob.dropoffLat,
      longitude: activeJob.dropoffLng,
    };
  }, [activeJob]);

  if (!driverCoords) {
    return (
      <View
        style={{
          height: 320,
          borderRadius: 20,
          backgroundColor: '#0f172a',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white' }}>
          Waiting for live GPS...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        height: 320,
        overflow: 'hidden',
        borderRadius: 20,
      }}
    >
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: driverCoords.latitude,
          longitude: driverCoords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={false}
        showsCompass
        rotateEnabled
      >
        <Marker
          coordinate={driverCoords}
          title="Driver"
          description="Live driver location"
          pinColor="#06b6d4"
        />

        {pickupCoords ? (
          <Marker
            coordinate={pickupCoords}
            title="Pickup"
            description={activeJob?.pickup}
            pinColor="#22c55e"
          />
        ) : null}

        {dropoffCoords ? (
          <Marker
            coordinate={dropoffCoords}
            title="Dropoff"
            description={activeJob?.dropoff}
            pinColor="#ef4444"
          />
        ) : null}

        {driverCoords && pickupCoords ? (
          <Polyline
            coordinates={[
              driverCoords,
              pickupCoords,
            ]}
            strokeWidth={4}
            strokeColor="#06b6d4"
          />
        ) : null}

        {pickupCoords && dropoffCoords ? (
          <Polyline
            coordinates={[
              pickupCoords,
              dropoffCoords,
            ]}
            strokeWidth={4}
            strokeColor="#22c55e"
          />
        ) : null}
      </MapView>
    </View>
  );
}