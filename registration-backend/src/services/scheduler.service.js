const cron = require('node-cron');
const pool = require('../db/pool');
const redisClient = require('../config/redis');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.schedulingEnabled = true;
  }

  async start() {
    console.log('Starting scheduler service...');

    this.schedulingEnabled = await this.ensureSchedulingSchema();
    if (!this.schedulingEnabled) {
      console.log('Scheduler service started (scheduling disabled: schema not ready)');
      return;
    }
    
    // Check for scheduled forms every minute
    cron.schedule('* * * * *', async () => {
      await this.checkScheduledForms();
    });

    // Clean up old eligibility cache every hour
    cron.schedule('0 * * * *', async () => {
      await this.cleanupEligibilityCache();
    });

    console.log('Scheduler service started');
  }

  async ensureSchedulingSchema() {
    let client = null;
    try {
      client = await pool.connect();
      await client.query(`
        ALTER TABLE forms
          ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS scheduled_close_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS auto_open BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS auto_close BOOLEAN DEFAULT false;
      `);

      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_forms_scheduling ON forms(scheduled_publish_at, scheduled_close_at, status);`
      );

      return true;
    } catch (error) {
      console.error('Scheduling schema not ready (run migration or grant ALTER privileges):', error.message || error);
      return false;
    } finally {
      if (client) client.release();
    }
  }

  async checkScheduledForms() {
    if (!this.schedulingEnabled) return;
    let client = null;
    try {
      client = await pool.connect();
      // Check for forms to open
      const openResult = await client.query(`
        UPDATE forms 
        SET status = 'OPEN', auto_open = true
        WHERE status = 'DRAFT' 
        AND scheduled_publish_at <= (NOW() AT TIME ZONE 'UTC')
        AND scheduled_publish_at IS NOT NULL
        AND auto_open = false
        RETURNING id, title
      `);

      // Check for forms to close
      const closeResult = await client.query(`
        UPDATE forms 
        SET status = 'CLOSED', auto_close = true
        WHERE status = 'OPEN' 
        AND scheduled_close_at <= (NOW() AT TIME ZONE 'UTC')
        AND scheduled_close_at IS NOT NULL
        AND auto_close = false
        RETURNING id, title
      `);

      // Clear cache for updated forms
      const updatedForms = [...openResult.rows, ...closeResult.rows];
      for (const form of updatedForms) {
        await this.clearFormCache(form.id);
        console.log(`Form ${form.title} (${form.id}) status updated automatically`);
      }

    } catch (error) {
      console.error('Error checking scheduled forms:', error);
    } finally {
      if (client) client.release();
    }
  }

  async clearFormCache(formId) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return;
      }
      const keys = await redisClient.keys(`form:${formId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      
      // Clear eligibility cache
      const eligibilityKeys = await redisClient.keys(`eligibility:${formId}:*`);
      if (eligibilityKeys.length > 0) {
        await redisClient.del(eligibilityKeys);
      }
    } catch (error) {
      console.error('Error clearing form cache:', error);
    }
  }

  async cleanupEligibilityCache() {
    let client = null;
    try {
      client = await pool.connect();
      await client.query(`
        DELETE FROM eligibility_cache 
        WHERE updated_at < NOW() - INTERVAL '24 hours'
      `);
    } catch (error) {
      console.error('Error cleaning up eligibility cache:', error);
    } finally {
      if (client) client.release();
    }
  }

  async scheduleForm(formId, publishAt, closeAt) {
    let client = null;
    try {
      client = await pool.connect();
      await client.query(`
        UPDATE forms 
        SET scheduled_publish_at = $1, scheduled_close_at = $2
        WHERE id = $3
      `, [publishAt, closeAt, formId]);

      await this.clearFormCache(formId);
      return true;
    } catch (error) {
      console.error('Error scheduling form:', error);
      return false;
    } finally {
      if (client) client.release();
    }
  }

  stop() {
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();
  }
}

module.exports = new SchedulerService();
