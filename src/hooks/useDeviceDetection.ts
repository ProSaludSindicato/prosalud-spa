import { useState, useEffect } from 'react';

export type DeviceType = 'android' | 'ios' | 'unknown';

export function useDeviceDetection(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');

  useEffect(() => {
    const detectDevice = (): DeviceType => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

      // Detectar iOS
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        return 'ios';
      }

      // Detectar Android
      if (/android/i.test(userAgent)) {
        return 'android';
      }

      // Detectar por navegador (fallback)
      // Safari generalmente indica iOS
      if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent) && !/Chromium/.test(userAgent)) {
        // Podría ser iOS o macOS, pero en móviles es más probable iOS
        if (/Mobile/.test(userAgent)) {
          return 'ios';
        }
      }

      // Chrome u otros navegadores en móviles generalmente son Android
      if (/Mobile/.test(userAgent) && /Chrome/.test(userAgent)) {
        return 'android';
      }

      return 'unknown';
    };

    setDeviceType(detectDevice());
  }, []);

  return deviceType;
}

