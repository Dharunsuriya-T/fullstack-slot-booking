const { createClient } = require('redis');

const redisEnabled = String(process.env.REDIS_ENABLED || '').toLowerCase() === 'true';

if (!redisEnabled) {
  module.exports = {
    isOpen: false,
    get: async () => null,
    set: async () => null,
    del: async () => 0,
    keys: async () => [],
    connect: async () => {},
    quit: async () => {}
  };
} else {
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis reconnect attempts exhausted');
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });

  redisClient.connect().catch((err) => {
    console.error('Redis connect failed (continuing without cache):', err.message || err);
  });

  module.exports = redisClient;
}
