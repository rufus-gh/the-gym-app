import { useUIStore } from '@/stores/uiStore';

class SyncService {
  private _isSyncing: boolean = false;

  /**
   * Trigger a push + pull sync cycle. Guards against concurrent invocations.
   * Phase 2 TODO: implement push/pull against the tRPC sync router.
   */
  async triggerSync(): Promise<void> {
    if (this._isSyncing) {
      return;
    }

    this._isSyncing = true;
    useUIStore.getState().setSyncStatus('syncing');

    try {
      // Phase 2 TODO: push local changes
      // await syncPush();

      // Phase 2 TODO: pull remote changes
      // await syncPull();

      useUIStore.getState().setSyncStatus('idle');
    } catch {
      useUIStore.getState().setSyncStatus('error');
    } finally {
      this._isSyncing = false;
    }
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }
}

export const syncService = new SyncService();
