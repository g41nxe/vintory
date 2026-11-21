// Per-device conveniences, stored in localStorage. Never essential data:
// if storage is unavailable, the defaults apply and nothing breaks.

const NEW_WINE_OWNED_KEY = 'vintory_new_wine_owned';

/** Whether a newly added wine starts as „im Besitz“ – remembers the user's last choice. Default: yes. */
export const getNewWineOwnedDefault = (): boolean => {
  try {
    const value = localStorage.getItem(NEW_WINE_OWNED_KEY);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
};

export const setNewWineOwnedDefault = (owned: boolean): void => {
  try {
    localStorage.setItem(NEW_WINE_OWNED_KEY, String(owned));
  } catch {
    // ignore – only a convenience
  }
};

const MERCHANT_CLEANUP_DONE_KEY = 'vintory_merchant_cleanup_done';

/** Whether „Händler aufräumen“ was already used on this device – then the button is hidden. */
export const isMerchantCleanupDone = (): boolean => {
  try {
    return localStorage.getItem(MERCHANT_CLEANUP_DONE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markMerchantCleanupDone = (): void => {
  try {
    localStorage.setItem(MERCHANT_CLEANUP_DONE_KEY, 'true');
  } catch {
    // ignore – only a convenience
  }
};
