// Ask the browser to keep the stored data (D75). By default a browser may clear a site's
// storage when the device runs low on space; persistent storage is only cleared by the user.
// Chrome on Android decides without asking the DM, and an installed app is usually kept.

/** The part of the browser's StorageManager this needs; missing in old browsers. */
export type StorageApi = Partial<Pick<StorageManager, 'persist' | 'persisted'>>;

/**
 * Asks once, at start, unless the data is already kept. A missing API, a refusal or an error
 * changes nothing: the data stays as safe as it was, and there is no message to the DM.
 */
export async function keepStoredData(
  storage: StorageApi | undefined = navigator.storage,
): Promise<void> {
  if (!storage?.persist) return;
  try {
    if (await storage.persisted?.()) return;
    await storage.persist();
  } catch {
    // Not kept this time; the next start asks again.
  }
}
