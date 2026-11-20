import { useEffect, useState } from 'react';
import { getDonationSettings, type DonationSettings } from '../api/member';

// Loaded once per app run; the admin rarely changes the UPI ID
let cached: DonationSettings | null = null;

/** The society's UPI details and donation limits (GET /user/donation-settings). null while loading or offline. */
export function useDonationSettings() {
  const [settings, setSettings] = useState<DonationSettings | null>(cached);

  useEffect(() => {
    if (cached) return;
    let active = true;
    getDonationSettings()
      .then(({ data }) => {
        cached = data;
        if (active) setSettings(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
