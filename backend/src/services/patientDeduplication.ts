import { prisma } from '../lib/db';
import { Patient } from '@prisma/client';

/**
 * Patient Deduplication Service
 * Provides fuzzy matching and deduplication capabilities for patient records
 */

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface PatientInput {
  name: string;
  dob?: Date | string | null;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
  gender?: string | null;
}

export interface DuplicateMatch {
  patient: Patient;
  score: number;
  matchReasons: string[];
}

export interface MergeResult {
  primaryPatient: Patient;
  mergedData: {
    duplicateId: string;
    recordsTransferred: {
      appointments: number;
      encounters: number;
      admissions: number;
      invoices: number;
      orders: number;
      documents: number;
    };
  };
}

// ===========================
// LEVENSHTEIN DISTANCE ALGORITHM
// ===========================

/**
 * Calculate Levenshtein distance between two strings
 * This measures the minimum number of single-character edits required to change one word into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage based on Levenshtein distance
 * Returns a value between 0 and 100
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 100;

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 100;

  return Math.round(((maxLength - distance) / maxLength) * 100);
}

// ===========================
// NAME MATCHING ALGORITHMS
// ===========================

/**
 * Normalize name for comparison (remove special chars, extra spaces, convert to lowercase)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

/**
 * Calculate name similarity score
 * Takes into account full name, first name, last name matches
 */
function calculateNameScore(name1: string, name2: string): number {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);

  // Exact match
  if (normalized1 === normalized2) return 100;

  // Full name similarity
  const fullNameSimilarity = calculateSimilarity(normalized1, normalized2);

  // Split into parts for partial matching
  const parts1 = normalized1.split(' ').filter(p => p.length > 0);
  const parts2 = normalized2.split(' ').filter(p => p.length > 0);

  if (parts1.length === 0 || parts2.length === 0) {
    return fullNameSimilarity;
  }

  // Check for first name and last name matches
  let partialScore = 0;
  let matchedParts = 0;

  // Compare each part
  for (const part1 of parts1) {
    for (const part2 of parts2) {
      const partSimilarity = calculateSimilarity(part1, part2);
      if (partSimilarity >= 80) { // Consider it a match if 80% or more similar
        partialScore += partSimilarity;
        matchedParts++;
      }
    }
  }

  // Calculate weighted score
  if (matchedParts > 0) {
    const averagePartialScore = partialScore / matchedParts;
    // Weight: 70% full name, 30% partial matches
    return Math.round(fullNameSimilarity * 0.7 + averagePartialScore * 0.3);
  }

  return fullNameSimilarity;
}

// ===========================
// DATE COMPARISON
// ===========================

/**
 * Check if two dates match
 */
function datesMatch(date1?: Date | string | null, date2?: Date | string | null): boolean {
  if (!date1 || !date2) return false;

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ===========================
// CONTACT INFO COMPARISON
// ===========================

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, ''); // Remove all non-digit characters
}

/**
 * Check if two phone numbers match
 */
function phoneNumbersMatch(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;

  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);

  // Check if one is a substring of the other (handles country codes)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  // Check last 10 digits (standard phone number length)
  const last10_1 = normalized1.slice(-10);
  const last10_2 = normalized2.slice(-10);

  return last10_1 === last10_2;
}

/**
 * Check if two email addresses match
 */
function emailsMatch(email1?: string | null, email2?: string | null): boolean {
  if (!email1 || !email2) return false;

  return email1.toLowerCase().trim() === email2.toLowerCase().trim();
}

// ===========================
// ADDRESS COMPARISON
// ===========================

/**
 * Calculate address similarity
 */
function calculateAddressSimilarity(addr1?: string | null, addr2?: string | null): number {
  if (!addr1 || !addr2) return 0;

  const normalized1 = addr1.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const normalized2 = addr2.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  return calculateSimilarity(normalized1, normalized2);
}

// ===========================
// DUPLICATE SCORING SYSTEM
// ===========================

/**
 * Calculate match score between two patients
 * Returns a score from 0-100 and reasons for the match
 */
function calculateMatchScore(
  inputPatient: PatientInput,
  existingPatient: Patient
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // 1. Name matching (Weight: 40 points)
  const nameWeight = 40;
  const nameScore = calculateNameScore(inputPatient.name, existingPatient.name);
  totalScore += (nameScore / 100) * nameWeight;
  totalWeight += nameWeight;

  if (nameScore >= 90) {
    reasons.push(`Name highly similar (${nameScore}%)`);
  } else if (nameScore >= 70) {
    reasons.push(`Name similar (${nameScore}%)`);
  }

  // 2. Date of Birth matching (Weight: 25 points)
  if (inputPatient.dob && existingPatient.dob) {
    const dobWeight = 25;
    totalWeight += dobWeight;

    if (datesMatch(inputPatient.dob, existingPatient.dob)) {
      totalScore += dobWeight;
      reasons.push('Date of birth matches');
    }
  }

  // 3. Phone number matching (Weight: 20 points)
  if (inputPatient.contact && existingPatient.contact) {
    const phoneWeight = 20;
    totalWeight += phoneWeight;

    if (phoneNumbersMatch(inputPatient.contact, existingPatient.contact)) {
      totalScore += phoneWeight;
      reasons.push('Phone number matches');
    }
  }

  // 4. Email matching (Weight: 10 points)
  if (inputPatient.email && existingPatient.email) {
    const emailWeight = 10;
    totalWeight += emailWeight;

    if (emailsMatch(inputPatient.email, existingPatient.email)) {
      totalScore += emailWeight;
      reasons.push('Email matches');
    }
  }

  // 5. Address matching (Weight: 5 points)
  if (inputPatient.address && existingPatient.address) {
    const addressWeight = 5;
    totalWeight += addressWeight;

    const addressSimilarity = calculateAddressSimilarity(inputPatient.address, existingPatient.address);
    if (addressSimilarity >= 80) {
      totalScore += (addressSimilarity / 100) * addressWeight;
      reasons.push(`Address similar (${addressSimilarity}%)`);
    }
  }

  // Normalize score to 0-100 based on actual weights available
  const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

  return { score: finalScore, reasons };
}

// ===========================
// MAIN DEDUPLICATION FUNCTIONS
// ===========================

/**
 * Find potential duplicate patients
 * Returns matches with confidence scores
 */
export async function findPotentialDuplicates(
  patientInput: PatientInput,
  tenantId: string,
  branchId?: string,
  excludePatientId?: string
): Promise<DuplicateMatch[]> {
  try {
    // Build where clause for candidate selection
    const whereClause: any = {
      tenantId,
      ...(branchId && { branchId }),
      ...(excludePatientId && { id: { not: excludePatientId } }),
    };

    // Get candidate patients
    // We'll use a broad search and then score them
    let candidates: Patient[] = [];

    // Strategy 1: Find by exact or similar name (using database ILIKE for initial filtering)
    const nameWords = patientInput.name.trim().split(/\s+/).filter(w => w.length > 2);

    if (nameWords.length > 0) {
      // Build OR conditions for name search
      const nameConditions = nameWords.map(word => ({
        name: {
          contains: word,
          mode: 'insensitive' as const,
        },
      }));

      candidates = await prisma.patient.findMany({
        where: {
          ...whereClause,
          OR: nameConditions,
        },
        take: 100, // Limit initial candidates
      });
    }

    // Strategy 2: If contact provided, also search by contact
    if (patientInput.contact && candidates.length < 20) {
      const normalizedContact = normalizePhone(patientInput.contact);
      const last10 = normalizedContact.slice(-10);

      const contactMatches = await prisma.patient.findMany({
        where: {
          ...whereClause,
          contact: {
            contains: last10,
          },
        },
        take: 50,
      });

      // Merge with existing candidates (avoid duplicates)
      const candidateIds = new Set(candidates.map(c => c.id));
      for (const match of contactMatches) {
        if (!candidateIds.has(match.id)) {
          candidates.push(match);
        }
      }
    }

    // Strategy 3: If email provided, search by email
    if (patientInput.email && candidates.length < 20) {
      const emailMatches = await prisma.patient.findMany({
        where: {
          ...whereClause,
          email: {
            equals: patientInput.email.toLowerCase().trim(),
            mode: 'insensitive',
          },
        },
        take: 20,
      });

      const candidateIds = new Set(candidates.map(c => c.id));
      for (const match of emailMatches) {
        if (!candidateIds.has(match.id)) {
          candidates.push(match);
        }
      }
    }

    // Calculate match scores for all candidates
    const matches: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      const { score, reasons } = calculateMatchScore(patientInput, candidate);

      // Only include matches with score >= 60 (moderate confidence)
      if (score >= 60) {
        matches.push({
          patient: candidate,
          score,
          matchReasons: reasons,
        });
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    return matches;
  } catch (error) {
    console.error('Error finding potential duplicates:', error);
    throw new Error('Failed to find potential duplicates');
  }
}

/**
 * Merge two patient records
 * Transfers all related records from duplicate to primary patient
 */
export async function mergePatients(
  primaryId: string,
  duplicateId: string,
  tenantId: string
): Promise<MergeResult> {
  try {
    // Verify both patients exist and belong to the same tenant
    const [primaryPatient, duplicatePatient] = await Promise.all([
      prisma.patient.findUnique({ where: { id: primaryId } }),
      prisma.patient.findUnique({ where: { id: duplicateId } }),
    ]);

    if (!primaryPatient || !duplicatePatient) {
      throw new Error('One or both patients not found');
    }

    if (primaryPatient.tenantId !== tenantId || duplicatePatient.tenantId !== tenantId) {
      throw new Error('Unauthorized: Patients do not belong to this tenant');
    }

    if (primaryId === duplicateId) {
      throw new Error('Cannot merge a patient with itself');
    }

    // Perform merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Track counts of transferred records
      const recordCounts = {
        appointments: 0,
        encounters: 0,
        admissions: 0,
        invoices: 0,
        orders: 0,
        documents: 0,
      };

      // 1. Transfer appointments
      const appointmentUpdate = await tx.appointment.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });
      recordCounts.appointments = appointmentUpdate.count;

      // 2. Transfer encounters
      const encounterUpdate = await tx.encounter.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });
      recordCounts.encounters = encounterUpdate.count;

      // 3. Transfer admissions
      const admissionUpdate = await tx.admission.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });
      recordCounts.admissions = admissionUpdate.count;

      // 4. Transfer invoices
      const invoiceUpdate = await tx.invoice.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });
      recordCounts.invoices = invoiceUpdate.count;

      // 5. Transfer orders
      const orderUpdate = await tx.order.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });
      recordCounts.orders = orderUpdate.count;

      // 6. Transfer documents
      const documentUpdate = await tx.document.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });
      recordCounts.documents = documentUpdate.count;

      // 7. Transfer OPD notes
      await tx.oPDNote.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 8. Transfer prescriptions
      await tx.prescription.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 9. Transfer feedbacks
      await tx.feedback.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 10. Transfer incidents
      await tx.incident.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 11. Transfer diet orders
      await tx.dietOrder.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 12. Transfer pre-authorizations
      await tx.preAuthorization.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 13. Transfer patient insurances
      await tx.patientInsurance.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 14. Transfer commissions
      await tx.commission.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 15. Transfer critical alerts
      await tx.criticalAlert.updateMany({
        where: { patientId: duplicateId },
        data: { patientId: primaryId },
      });

      // 16. Update primary patient with any missing information from duplicate
      const updateData: any = {};

      if (!primaryPatient.contact && duplicatePatient.contact) {
        updateData.contact = duplicatePatient.contact;
      }
      if (!primaryPatient.email && duplicatePatient.email) {
        updateData.email = duplicatePatient.email;
      }
      if (!primaryPatient.address && duplicatePatient.address) {
        updateData.address = duplicatePatient.address;
      }
      if (!primaryPatient.dob && duplicatePatient.dob) {
        updateData.dob = duplicatePatient.dob;
      }
      if (!primaryPatient.gender && duplicatePatient.gender) {
        updateData.gender = duplicatePatient.gender;
      }
      if (!primaryPatient.bloodGroup && duplicatePatient.bloodGroup) {
        updateData.bloodGroup = duplicatePatient.bloodGroup;
      }
      if (!primaryPatient.allergies && duplicatePatient.allergies) {
        updateData.allergies = duplicatePatient.allergies;
      }
      if (!primaryPatient.emergencyContact && duplicatePatient.emergencyContact) {
        updateData.emergencyContact = duplicatePatient.emergencyContact;
      }

      let updatedPrimary = primaryPatient;
      if (Object.keys(updateData).length > 0) {
        updatedPrimary = await tx.patient.update({
          where: { id: primaryId },
          data: updateData,
        });
      }

      // 17. Delete the duplicate patient record
      await tx.patient.delete({
        where: { id: duplicateId },
      });

      return {
        primaryPatient: updatedPrimary,
        recordCounts,
      };
    });

    return {
      primaryPatient: result.primaryPatient,
      mergedData: {
        duplicateId,
        recordsTransferred: result.recordCounts,
      },
    };
  } catch (error) {
    console.error('Error merging patients:', error);
    throw error;
  }
}

/**
 * Get duplicate summary statistics for a patient
 */
export async function getDuplicateStats(patientId: string, tenantId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient || patient.tenantId !== tenantId) {
    throw new Error('Patient not found or unauthorized');
  }

  const duplicates = await findPotentialDuplicates(
    {
      name: patient.name,
      dob: patient.dob,
      contact: patient.contact,
      email: patient.email,
      address: patient.address,
      gender: patient.gender,
    },
    tenantId,
    patient.branchId,
    patientId
  );

  return {
    totalPotentialDuplicates: duplicates.length,
    highConfidence: duplicates.filter(d => d.score >= 85).length,
    mediumConfidence: duplicates.filter(d => d.score >= 70 && d.score < 85).length,
    lowConfidence: duplicates.filter(d => d.score < 70).length,
  };
}
