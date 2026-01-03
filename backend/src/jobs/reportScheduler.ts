/**
 * Report Scheduler Job
 *
 * Cron job to run scheduled reports automatically
 */

import { PrismaClient } from '@prisma/client';
import { scheduleReport } from '../services/reportBuilder';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Run all due scheduled reports
 */
export async function runScheduledReports() {
  try {
    logger.info('Running scheduled reports check...');

    // Find all active schedules that are due
    const now = new Date();
    const dueSchedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now
        }
      },
      include: {
        template: {
          select: {
            name: true,
            tenantId: true
          }
        }
      }
    });

    logger.info(`Found ${dueSchedules.length} scheduled reports to run`);

    // Run each schedule
    for (const schedule of dueSchedules) {
      try {
        logger.info(`Running scheduled report: ${schedule.template.name}`);
        await scheduleReport(schedule.id);
        logger.info(`Successfully ran scheduled report: ${schedule.template.name}`);
      } catch (error) {
        logger.error(`Failed to run scheduled report ${schedule.template.name}:`, error);
        // Continue with other schedules even if one fails
      }
    }

    logger.info('Scheduled reports check completed');
  } catch (error) {
    logger.error('Error running scheduled reports:', error);
  }
}

/**
 * Start the scheduler (runs every 15 minutes)
 */
export function startReportScheduler() {
  // Run immediately on startup
  runScheduledReports();

  // Then run every 15 minutes
  setInterval(runScheduledReports, 15 * 60 * 1000);

  logger.info('Report scheduler started (runs every 15 minutes)');
}

/**
 * Cleanup expired reports (runs daily)
 */
export async function cleanupExpiredReportsJob() {
  try {
    logger.info('Running expired reports cleanup...');

    const { cleanupExpiredReports } = await import('../services/reportBuilder');
    const deletedCount = await cleanupExpiredReports();

    logger.info(`Cleaned up ${deletedCount} expired reports`);
  } catch (error) {
    logger.error('Error cleaning up expired reports:', error);
  }
}

/**
 * Start the cleanup job (runs daily at 2 AM)
 */
export function startCleanupJob() {
  // Calculate time until next 2 AM
  const now = new Date();
  const next2AM = new Date();
  next2AM.setHours(2, 0, 0, 0);

  if (next2AM <= now) {
    next2AM.setDate(next2AM.getDate() + 1);
  }

  const timeUntil2AM = next2AM.getTime() - now.getTime();

  // Schedule first run
  setTimeout(() => {
    cleanupExpiredReportsJob();

    // Then run daily
    setInterval(cleanupExpiredReportsJob, 24 * 60 * 60 * 1000);
  }, timeUntil2AM);

  logger.info(`Cleanup job scheduled for ${next2AM.toLocaleString()}`);
}

// Start both jobs if this module is run directly
if (require.main === module) {
  startReportScheduler();
  startCleanupJob();
}
