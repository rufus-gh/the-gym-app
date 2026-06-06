import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useUIStore } from '@/stores/uiStore';

type ReconnectCallback = () => void;
type UnsubscribeFn = () => void;

class NetworkService {
  private _isConnected: boolean = true;
  private _reconnectCallbacks: Set<ReconnectCallback> = new Set();
  private _netInfoUnsubscribe: UnsubscribeFn | null = null;
  private _initialised: boolean = false;

  init(): void {
    if (this._initialised) {
      return;
    }
    this._initialised = true;

    this._netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const isConnected = state.isConnected === true && state.isInternetReachable !== false;
        const wasConnected = this._isConnected;
        this._isConnected = isConnected;

        useUIStore.getState().setOffline(!isConnected);

        if (!wasConnected && isConnected) {
          this._reconnectCallbacks.forEach((cb) => {
            try {
              cb();
            } catch {
              // Callbacks must not crash the service — swallow and continue
            }
          });
        }
      },
    );
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Register a callback that fires when the device transitions from offline
   * to online. Returns an unsubscribe function.
   */
  onReconnect(cb: ReconnectCallback): UnsubscribeFn {
    this._reconnectCallbacks.add(cb);
    return () => {
      this._reconnectCallbacks.delete(cb);
    };
  }

  /**
   * Tear down the NetInfo subscription. Intended for test cleanup only.
   */
  destroy(): void {
    if (this._netInfoUnsubscribe) {
      this._netInfoUnsubscribe();
      this._netInfoUnsubscribe = null;
    }
    this._reconnectCallbacks.clear();
    this._initialised = false;
  }
}

export const networkService = new NetworkService();
