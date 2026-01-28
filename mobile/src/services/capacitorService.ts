// @ts-nocheck
import { App as CapacitorApp } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Storage } from '@capacitor/storage';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import { Haptics } from '@capacitor/haptics';
import { PushNotifications } from '@capacitor/push-notifications';

export const initializeCapacitor = async () => {
  try {
    // Set status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#667eea' });

    // Register app listeners
    CapacitorApp.addListener('backButton', () => {
      // Handle back button for Android
    });

    // Request notification permissions
    await PushNotifications.requestPermissions();
    await PushNotifications.addListener(
      'registration',
      (token: any) => {
        console.log('Push registration token:', token.value);
      }
    );

    // Set up network listener
    await Network.addListener('networkStatusChange', (status) => {
      console.log('Network status:', status.connected);
    });

    console.log('Capacitor initialized');
  } catch (error) {
    console.error('Capacitor initialization error:', error);
  }
};

export const CameraService = {
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      return image.base64String;
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  },

  async pickImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      return image.base64String;
    } catch (error) {
      console.error('Photo picker error:', error);
      throw error;
    }
  },
};

export const LocationService = {
  async getCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
      };
    } catch (error) {
      console.error('Geolocation error:', error);
      throw error;
    }
  },

  async watchLocation(callback: (location: any) => void) {
    const watchId = await Geolocation.watchPosition({}, (position) => {
      if (position) {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      }
    });
    return watchId;
  },

  async clearWatch(watchId: string) {
    await Geolocation.clearWatch({ id: watchId });
  },
};

export const StorageService = {
  async setItem(key: string, value: any) {
    try {
      await Storage.set({
        key,
        value: JSON.stringify(value),
      });
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  async getItem(key: string) {
    try {
      const result = await Storage.get({ key });
      return result.value ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  async removeItem(key: string) {
    try {
      await Storage.remove({ key });
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  async clear() {
    try {
      await Storage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

export const KeyboardService = {
  async show() {
    try {
      await Keyboard.show();
    } catch (error) {
      console.error('Keyboard show error:', error);
    }
  },

  async hide() {
    try {
      await Keyboard.hide();
    } catch (error) {
      console.error('Keyboard hide error:', error);
    }
  },
};

export const HapticsService = {
  async vibrate(duration = 300) {
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  },

  async impact(style = 'Heavy') {
    try {
      await Haptics.impact({ style: style as any });
    } catch (error) {
      console.error('Haptics impact error:', error);
    }
  },

  async notification(type = 'Success') {
    try {
      await Haptics.notification({ type: type as any });
    } catch (error) {
      console.error('Haptics notification error:', error);
    }
  },
};

export const NetworkService = {
  async isOnline() {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch (error) {
      console.error('Network status error:', error);
      return false;
    }
  },
};
