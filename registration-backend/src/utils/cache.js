const redisClient = require('../config/redis');

/**
 * Checks if Redis is active and connected.
 */
function isRedisActive() {
  return redisClient && redisClient.isOpen;
}

/**
 * Get a parsed JSON value from cache by key.
 * Returns null on cache miss or if Redis is unavailable.
 */
async function getCache(key) {
  try {
    if (!isRedisActive()) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`[CACHE_ERROR] Failed to get key "${key}":`, error.message || error);
    return null;
  }
}

/**
 * Set a JSON stringified value in cache with a TTL (Time To Live).
 */
async function setCache(key, value, ttlSeconds = 3600) {
  try {
    if (!isRedisActive()) return;
    const stringValue = JSON.stringify(value);
    await redisClient.set(key, stringValue, { EX: ttlSeconds });
  } catch (error) {
    console.error(`[CACHE_ERROR] Failed to set key "${key}":`, error.message || error);
  }
}

/**
 * Delete a key from cache.
 */
async function deleteCache(key) {
  try {
    if (!isRedisActive()) return;
    await redisClient.del(key);
  } catch (error) {
    console.error(`[CACHE_ERROR] Failed to delete key "${key}":`, error.message || error);
  }
}

/**
 * Delete all keys matching a specific pattern (e.g. "form:1:*").
 */
async function clearCachePattern(pattern) {
  try {
    if (!isRedisActive()) return;
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`[CACHE_ERROR] Failed to clear pattern "${pattern}":`, error.message || error);
  }
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  clearCachePattern
};
