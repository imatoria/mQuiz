// Phase 6: Network Request Queue Utility
// Manages batching, prioritization, and smart handling of network requests

type Priority = 'critical' | 'high' | 'normal' | 'low';

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  priority: Priority;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

class NetworkRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private connectionQuality: 'good' | 'fair' | 'poor' = 'good';
  private requestTimes: number[] = [];
  
  constructor() {
    this.monitorConnectionQuality();
  }

  /**
   * Add a request to the queue
   */
  enqueue(
    execute: () => Promise<any>,
    priority: Priority = 'normal',
    maxRetries: number = 3
  ): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: QueuedRequest = {
      id,
      execute,
      priority,
      timestamp: Date.now(),
      retries: 0,
      maxRetries
    };
    
    this.queue.push(request);
    this.sortQueue();
    
    // Start processing if not already running
    if (!this.processing) {
      this.process();
    }
    
    return id;
  }

  /**
   * Remove a request from the queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(req => req.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    const priorityOrder: Record<Priority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    };
    
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, older requests first
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Process queue
   */
  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue[0];
      
      // Skip low priority requests if connection is poor
      if (this.connectionQuality === 'poor' && request.priority === 'low') {
        console.log('Skipping low priority request due to poor connection');
        this.queue.shift();
        continue;
      }
      
      try {
        const startTime = Date.now();
        await request.execute();
        const duration = Date.now() - startTime;
        
        // Track request time for connection quality monitoring
        this.requestTimes.push(duration);
        if (this.requestTimes.length > 10) {
          this.requestTimes.shift();
        }
        
        // Remove successful request
        this.queue.shift();
        
        // Add delay based on connection quality
        const delay = this.connectionQuality === 'poor' ? 1000 : 
                     this.connectionQuality === 'fair' ? 500 : 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error('Request failed:', error);
        
        // Retry logic
        request.retries++;
        if (request.retries < request.maxRetries) {
          console.log(`Retrying request (${request.retries}/${request.maxRetries})`);
          
          // Move to end of same-priority requests
          this.queue.shift();
          this.queue.push(request);
          this.sortQueue();
          
          // Exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, request.retries), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          console.error('Request failed after max retries, dropping');
          this.queue.shift();
        }
      }
    }
    
    this.processing = false;
  }

  /**
   * Monitor connection quality based on request performance
   */
  private monitorConnectionQuality() {
    setInterval(() => {
      if (this.requestTimes.length < 3) return;
      
      const avgTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
      
      if (avgTime < 1000) {
        this.connectionQuality = 'good';
      } else if (avgTime < 3000) {
        this.connectionQuality = 'fair';
      } else {
        this.connectionQuality = 'poor';
      }
      
      console.log(`Connection quality: ${this.connectionQuality} (avg: ${avgTime.toFixed(0)}ms)`);
    }, 5000);
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      connectionQuality: this.connectionQuality,
      priorityBreakdown: {
        critical: this.queue.filter(r => r.priority === 'critical').length,
        high: this.queue.filter(r => r.priority === 'high').length,
        normal: this.queue.filter(r => r.priority === 'normal').length,
        low: this.queue.filter(r => r.priority === 'low').length
      }
    };
  }

  /**
   * Clear all low priority requests
   */
  clearLowPriority() {
    this.queue = this.queue.filter(r => r.priority !== 'low');
    console.log('Cleared low priority requests');
  }
}

// Singleton instance
export const networkQueue = new NetworkRequestQueue();
