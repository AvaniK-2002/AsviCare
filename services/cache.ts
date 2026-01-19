import type { Patient, Visit, Expense, Appointment } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineCache {
  private readonly CACHE_PREFIX = 'clinictrack_cache_';
  private readonly PENDING_PREFIX = 'clinictrack_pending_';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Cache management
  set<T>(key: string, data: T, expiresIn?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined
    };
    localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.CACHE_PREFIX + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Pending operations (for offline actions)
  addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0
    };

    const pendingOps = this.getPendingOperations();
    pendingOps.push(pendingOp);
    localStorage.setItem(this.PENDING_PREFIX + 'operations', JSON.stringify(pendingOps));

    return id;
  }

  getPendingOperations(): PendingOperation[] {
    try {
      const item = localStorage.getItem(this.PENDING_PREFIX + 'operations');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading pending operations:', error);
      return [];
    }
  }

  removePendingOperation(id: string): void {
    const operations = this.getPendingOperations();
    const filtered = operations.filter(op => op.id !== id);
    localStorage.setItem(this.PENDING_PREFIX + 'operations', JSON.stringify(filtered));
  }

  updatePendingOperation(id: string, updates: Partial<PendingOperation>): void {
    const operations = this.getPendingOperations();
    const index = operations.findIndex(op => op.id === id);
    if (index !== -1) {
      operations[index] = { ...operations[index], ...updates };
      localStorage.setItem(this.PENDING_PREFIX + 'operations', JSON.stringify(operations));
    }
  }

  clearPendingOperations(): void {
    localStorage.removeItem(this.PENDING_PREFIX + 'operations');
  }

  // Specific cache methods for different entities
  cachePatients(patients: Patient[]): void {
    this.set('patients', patients, this.CACHE_DURATION);
  }

  getCachedPatients(): Patient[] | null {
    return this.get<Patient[]>('patients');
  }

  cacheVisits(visits: Visit[]): void {
    this.set('visits', visits, this.CACHE_DURATION);
  }

  getCachedVisits(): Visit[] | null {
    return this.get<Visit[]>('visits');
  }

  cacheExpenses(expenses: Expense[]): void {
    this.set('expenses', expenses, this.CACHE_DURATION);
  }

  getCachedExpenses(): Expense[] | null {
    return this.get<Expense[]>('expenses');
  }

  cacheAppointments(appointments: Appointment[]): void {
    this.set('appointments', appointments, this.CACHE_DURATION);
  }

  getCachedAppointments(): Appointment[] | null {
    return this.get<Appointment[]>('appointments');
  }

  // Sync status
  setLastSyncTime(timestamp: number): void {
    localStorage.setItem(this.CACHE_PREFIX + 'last_sync', timestamp.toString());
  }

  getLastSyncTime(): number | null {
    const timestamp = localStorage.getItem(this.CACHE_PREFIX + 'last_sync');
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  // Cache statistics
  getCacheStats(): {
    patients: boolean;
    visits: boolean;
    expenses: boolean;
    appointments: boolean;
    pendingOperations: number;
    lastSyncTime: number | null;
  } {
    return {
      patients: !!this.getCachedPatients(),
      visits: !!this.getCachedVisits(),
      expenses: !!this.getCachedExpenses(),
      appointments: !!this.getCachedAppointments(),
      pendingOperations: this.getPendingOperations().length,
      lastSyncTime: this.getLastSyncTime()
    };
  }

  // Background sync simulation
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline()) return;

    const operations = this.getPendingOperations();
    if (operations.length === 0) return;

    // In a real implementation, you would sync each operation with the server
    // For now, we'll just simulate success/failure
    for (const operation of operations) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate random success/failure
        if (Math.random() > 0.1) { // 90% success rate
          this.removePendingOperation(operation.id);
          console.log(`Synced operation: ${operation.type} ${operation.entity}`);
        } else {
          // Increment retry count
          this.updatePendingOperation(operation.id, {
            retryCount: operation.retryCount + 1
          });

          // Remove if too many retries
          if (operation.retryCount >= 3) {
            this.removePendingOperation(operation.id);
            console.warn(`Failed to sync operation after retries: ${operation.type} ${operation.entity}`);
          }
        }
      } catch (error) {
        console.error('Error syncing operation:', operation, error);
      }
    }
  }

  // Initialize cache listeners
  init(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Back online, syncing pending operations...');
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline, operations will be queued');
    });

    // Periodic sync check
    setInterval(() => {
      if (this.isOnline()) {
        this.syncPendingOperations();
      }
    }, 30000); // Check every 30 seconds
  }
}

export const cache = new OfflineCache();