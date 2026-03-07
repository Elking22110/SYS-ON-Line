/**
 * Sync Manager Utility
 * Handles offline-first data synchronization and operation queuing
 */
import { publish, EVENTS } from './observerManager';

class SyncManager {
    constructor() {
        this.queueKey = 'pos_sync_queue';
        this.isSyncing = false;
        this.checkInterval = 30000; // Check every 30 seconds if online

        // Listen for online status
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());

            // Periodic check
            setInterval(() => this.processQueue(), this.checkInterval);
        }
    }

    /**
     * Add an operation to the sync queue
     * @param {string} service - The service name (e.g., 'products', 'sales')
     * @param {string} method - The method to call (e.g., 'addProduct', 'createSale')
     * @param {Array} args - Arguments for the method
     * @param {Object} metadata - Optional metadata (e.g., localId for fallback)
     */
    async addToQueue(service, method, args, metadata = {}) {
        const queue = this.getQueue();
        const operation = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            service,
            method,
            args,
            metadata,
            timestamp: new Date().toISOString(),
            retryCount: 0
        };

        queue.push(operation);
        this.saveQueue(queue);

        console.log(`📥 Operation added to sync queue: ${service}.${method}`);

        // Try to process immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }
    }

    /**
     * Get the current sync queue from localStorage
     */
    getQueue() {
        try {
            return JSON.parse(localStorage.getItem(this.queueKey) || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Save the sync queue to localStorage
     */
    saveQueue(queue) {
        localStorage.setItem(this.queueKey, JSON.stringify(queue));
    }

    /**
     * Process the pending operations in the queue
     */
    async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`🔄 Processing sync queue (${queue.length} operations)...`);

        const remainingQueue = [];

        // Dynamic import to avoid circular dependency
        const { supabaseService } = await import('./supabaseService');

        for (const op of queue) {
            try {
                console.log(`📤 Syncing: ${op.service}.${op.method}...`);

                // Execute the method on supabaseService
                if (supabaseService[op.method]) {
                    await supabaseService[op.method](...op.args, { isSyncing: true });
                    console.log(`✅ Sync successful: ${op.id}`);
                } else {
                    console.warn(`⚠️ Method ${op.method} not found on supabaseService`);
                }
            } catch (error) {
                console.error(`❌ Sync failed for ${op.id}:`, error);

                op.retryCount++;
                // Keep in queue if retry count is low
                if (op.retryCount < 5) {
                    remainingQueue.push(op);
                } else {
                    console.error(`🚫 Max retries reached for operation ${op.id}. Dropping.`);
                }
            }
        }

        this.saveQueue(remainingQueue);
        this.isSyncing = false;

        if (remainingQueue.length === 0) {
            console.log('✨ Sync queue empty and processed successfully.');
        } else {
            console.log(`⏳ ${remainingQueue.length} operations still in queue (will retry).`);
        }
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            pendingCount: this.getQueue().length,
            isSyncing: this.isSyncing,
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
        };
    }
}

export const syncManager = new SyncManager();
export default syncManager;
