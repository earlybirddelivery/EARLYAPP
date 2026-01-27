/**
 * ETA Calculation Service
 * Calculates estimated delivery time based on past delivery routes
 */

import { calculateDistance } from '@/lib/locationTracking';

/**
 * Calculate average speed from historical deliveries
 * @param {Array} pastDeliveries - Array of past delivery data with routes
 * @returns {number} Average speed in km/h
 */
export const calculateAverageSpeed = (pastDeliveries) => {
  if (!pastDeliveries || pastDeliveries.length === 0) {
    return 25; // Default average speed in km/h
  }

  let totalDistance = 0;
  let totalTime = 0;

  pastDeliveries.forEach((delivery) => {
    if (delivery.route && delivery.route.length > 0) {
      // Calculate route distance
      let routeDistance = 0;
      for (let i = 0; i < delivery.route.length - 1; i++) {
        const p1 = delivery.route[i];
        const p2 = delivery.route[i + 1];
        routeDistance += calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon) / 1000; // Convert to km
      }

      // Calculate time taken
      const startTime = new Date(delivery.started_at).getTime();
      const endTime = new Date(delivery.completed_at).getTime();
      const timeHours = (endTime - startTime) / (1000 * 60 * 60);

      if (timeHours > 0) {
        totalDistance += routeDistance;
        totalTime += timeHours;
      }
    }
  });

  if (totalTime === 0) {
    return 25; // Default
  }

  const avgSpeed = totalDistance / totalTime;
  return Math.max(5, Math.min(50, avgSpeed)); // Between 5-50 km/h
};

/**
 * Calculate time stop duration (average time spent at each delivery)
 * @param {Array} pastDeliveries - Array of past delivery data
 * @returns {number} Average stop time in minutes
 */
export const calculateAverageStopTime = (pastDeliveries) => {
  if (!pastDeliveries || pastDeliveries.length === 0) {
    return 5; // Default 5 minutes per stop
  }

  let totalStopTime = 0;
  let stopCount = 0;

  pastDeliveries.forEach((delivery) => {
    if (delivery.reached_at && delivery.completed_at) {
      const reachedTime = new Date(delivery.reached_at).getTime();
      const completedTime = new Date(delivery.completed_at).getTime();
      const stopMinutes = (completedTime - reachedTime) / (1000 * 60);

      if (stopMinutes >= 0) {
        totalStopTime += stopMinutes;
        stopCount++;
      }
    }
  });

  if (stopCount === 0) {
    return 5;
  }

  const avgStopTime = totalStopTime / stopCount;
  return Math.max(2, Math.min(15, avgStopTime)); // Between 2-15 minutes
};

/**
 * Calculate ETA based on current position and destination
 * @param {Object} currentLocation - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @param {Array} upcomingDeliveries - Deliveries between current and destination
 * @param {Array} pastDeliveries - Historical deliveries for speed calculation
 * @returns {Object} ETA data {minutes, distance, stops}
 */
export const calculateETA = (
  currentLocation,
  destination,
  upcomingDeliveries = [],
  pastDeliveries = []
) => {
  const avgSpeed = calculateAverageSpeed(pastDeliveries); // km/h
  const avgStopTime = calculateAverageStopTime(pastDeliveries); // minutes

  // Distance to destination in meters
  const distanceToDestination = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    destination.latitude,
    destination.longitude
  );

  // Distance in km
  const distanceKm = distanceToDestination / 1000;

  // Travel time in minutes
  const travelTimeMinutes = (distanceKm / avgSpeed) * 60;

  // Stop time for upcoming deliveries
  const stopTimeMinutes = upcomingDeliveries.length * avgStopTime;

  // Total ETA in minutes
  const totalMinutes = Math.round(travelTimeMinutes + stopTimeMinutes);

  return {
    minutes: Math.max(1, totalMinutes), // At least 1 minute
    distanceKm: distanceKm.toFixed(2),
    travelTimeMinutes: Math.round(travelTimeMinutes),
    stopTimeMinutes: Math.round(stopTimeMinutes),
    stops: upcomingDeliveries.length,
    avgSpeed: avgSpeed.toFixed(1),
  };
};

/**
 * Format ETA for display
 * @param {number} minutes - Minutes
 * @returns {string} Formatted ETA (e.g., "25 mins", "1h 10m")
 */
export const formatETA = (minutes) => {
  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};

/**
 * Calculate ETA from delivery boy location to multiple stops
 * Useful for customers to see when delivery boy will arrive
 */
export const calculateMultiStopETA = (
  currentLocation,
  deliveries, // Array of deliveries with {latitude, longitude, sequence}
  pastDeliveries = []
) => {
  const avgSpeed = calculateAverageSpeed(pastDeliveries);
  const avgStopTime = calculateAverageStopTime(pastDeliveries);

  const etas = [];
  let cumulativeTime = 0;
  let currentPos = currentLocation;

  deliveries.forEach((delivery, index) => {
    // Distance to this delivery
    const distance = calculateDistance(
      currentPos.latitude,
      currentPos.longitude,
      delivery.latitude,
      delivery.longitude
    );

    const distanceKm = distance / 1000;
    const travelTime = (distanceKm / avgSpeed) * 60; // minutes

    cumulativeTime += travelTime;

    // Add stop time for all deliveries except the last
    if (index < deliveries.length - 1) {
      cumulativeTime += avgStopTime;
    }

    etas.push({
      deliveryId: delivery.id,
      etaMinutes: Math.max(1, Math.round(cumulativeTime)),
      etaFormatted: formatETA(Math.max(1, Math.round(cumulativeTime))),
      distanceKm: distanceKm.toFixed(2),
    });

    currentPos = { latitude: delivery.latitude, longitude: delivery.longitude };
  });

  return etas;
};

/**
 * Predict if delivery will be on time
 */
export const predictOnTime = (eta, maxDelayMinutes = 30) => {
  // If ETA is within maxDelayMinutes from promised time, likely on time
  return eta.minutes <= maxDelayMinutes;
};
