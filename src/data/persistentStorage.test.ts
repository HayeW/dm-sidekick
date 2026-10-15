import { describe, expect, it, vi } from 'vitest';
import { keepStoredData } from './persistentStorage';

describe('DC-100 — Mobile-first: ask the browser to keep the data (D75)', () => {
  it('asks once when the data is not kept yet', async () => {
    const persist = vi.fn(() => Promise.resolve(true));

    await keepStoredData({ persisted: () => Promise.resolve(false), persist });

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does not ask again when the data is already kept', async () => {
    const persist = vi.fn(() => Promise.resolve(true));

    await keepStoredData({ persisted: () => Promise.resolve(true), persist });

    expect(persist).not.toHaveBeenCalled();
  });

  it('asks when the browser cannot tell whether the data is kept', async () => {
    const persist = vi.fn(() => Promise.resolve(true));

    await keepStoredData({ persist });

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('is no error when the browser has no storage API (an old browser)', async () => {
    await expect(keepStoredData(undefined)).resolves.toBeUndefined();
    await expect(keepStoredData({})).resolves.toBeUndefined();
  });

  it('is no error when the browser refuses', async () => {
    const persist = vi.fn(() => Promise.resolve(false));

    await expect(
      keepStoredData({ persisted: () => Promise.resolve(false), persist }),
    ).resolves.toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('is no error when asking fails', async () => {
    await expect(
      keepStoredData({
        persisted: () => Promise.resolve(false),
        persist: () => Promise.reject(new Error('blocked')),
      }),
    ).resolves.toBeUndefined();
  });

  it('does not ask when it cannot tell whether the data is kept; the next start tries again', async () => {
    const persist = vi.fn(() => Promise.resolve(true));

    await expect(
      keepStoredData({ persisted: () => Promise.reject(new Error('blocked')), persist }),
    ).resolves.toBeUndefined();
    expect(persist).not.toHaveBeenCalled();
  });
});
