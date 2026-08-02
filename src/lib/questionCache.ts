// Phase 5: Question Caching Utility
// Provides local storage caching for test questions to improve resilience

interface CachedQuestions {
  paperId: string;
  questions: any[];
  timestamp: number;
  version: string;
}

const CACHE_KEY_PREFIX = 'test_questions_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const questionCache = {
  /**
   * Save questions to local storage
   */
  save: (paperId: string, questions: any[], version: string = '1.0') => {
    try {
      const cacheData: CachedQuestions = {
        paperId,
        questions,
        timestamp: Date.now(),
        version
      };
      
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${paperId}`,
        JSON.stringify(cacheData)
      );
      
      console.log(`Cached ${questions.length} questions for paper ${paperId}`);
    } catch (error) {
      console.error('Failed to cache questions:', error);
      // If storage is full, try to clear old caches
      questionCache.clearOldCaches();
    }
  },

  /**
   * Load questions from local storage
   */
  load: (paperId: string, version: string = '1.0'): any[] | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${paperId}`);
      
      if (!cached) {
        return null;
      }
      
      const cacheData: CachedQuestions = JSON.parse(cached);
      
      // Validate cache
      const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;
      const isWrongVersion = cacheData.version !== version;
      
      if (isExpired || isWrongVersion || cacheData.paperId !== paperId) {
        console.log('Cache invalid or expired, clearing...');
        questionCache.clear(paperId);
        return null;
      }
      
      console.log(`Loaded ${cacheData.questions.length} questions from cache`);
      return cacheData.questions;
    } catch (error) {
      console.error('Failed to load cached questions:', error);
      return null;
    }
  },

  /**
   * Clear cache for a specific paper
   */
  clear: (paperId: string) => {
    try {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${paperId}`);
      console.log(`Cleared cache for paper ${paperId}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },

  /**
   * Clear all question caches older than cache duration
   */
  clearOldCaches: () => {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      // Find all cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheData: CachedQuestions = JSON.parse(cached);
              if (now - cacheData.timestamp > CACHE_DURATION) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
      console.error('Silenced Error:', e);
            // Invalid cache entry, mark for removal
            keysToRemove.push(key);
          }
        }
      }
      
      // Remove old caches
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} old cache entries`);
    } catch (error) {
      console.error('Failed to clear old caches:', error);
    }
  },

  /**
   * Get cache info for debugging
   */
  getCacheInfo: (paperId: string): { exists: boolean; age?: number; size?: number } => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${paperId}`);
      
      if (!cached) {
        return { exists: false };
      }
      
      const cacheData: CachedQuestions = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      const size = new Blob([cached]).size;
      
      return {
        exists: true,
        age,
        size
      };
    } catch (error) {
      console.error('Silenced Error:', error);
      return { exists: false };
    }
  }
};
