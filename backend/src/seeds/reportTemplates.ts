/**
 * Report Templates Seed Data
 *
 * Pre-built report templates for common hospital reports
 */

import { PrismaClient } from '@prisma/client';
import { getSystemReportTemplates } from '../services/reportBuilder';

const prisma = new PrismaClient();

export async function seedReportTemplates(tenantId: string, createdBy: string) {
  console.log('🌱 Seeding report templates...');

  const templates = getSystemReportTemplates(tenantId, createdBy);

  for (const template of templates) {
    await prisma.reportTemplate.upsert({
      where: {
        tenantId_name: {
          tenantId: template.tenantId,
          name: template.name
        }
      },
      update: {
        ...template
      },
      create: {
        ...template
      }
    });
    console.log(`  ✅ Created template: ${template.name}`);
  }

  console.log(`✅ ${templates.length} report templates seeded successfully`);
}

export async function seedReportSchedulesExample(templateIds: string[]) {
  if (templateIds.length === 0) return;

  console.log('🌱 Creating example report schedules...');

  // Daily Patient Census - runs daily at 8 AM
  await prisma.reportSchedule.create({
    data: {
      templateId: templateIds[0], // Daily Patient Census
      frequency: 'daily',
      time: '08:00',
      recipients: ['admin@hospital.com', 'reports@hospital.com'],
      format: 'excel',
      isActive: true,
      nextRunAt: new Date(new Date().setHours(8, 0, 0, 0))
    }
  });

  // Monthly Revenue - runs on 1st of every month at 9 AM
  await prisma.reportSchedule.create({
    data: {
      templateId: templateIds[1], // Monthly Revenue Summary
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '09:00',
      recipients: ['finance@hospital.com', 'admin@hospital.com'],
      format: 'pdf',
      isActive: true,
      nextRunAt: getNextMonthlyRun(1, '09:00')
    }
  });

  console.log('✅ Example report schedules created');
}

function getNextMonthlyRun(dayOfMonth: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setDate(dayOfMonth);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}
