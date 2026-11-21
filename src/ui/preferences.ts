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
