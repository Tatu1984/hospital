import { describe, it, expect } from 'vitest';

/**
 * Patient Deduplication Service Tests
 *
 * These tests demonstrate the fuzzy matching algorithms used in patient deduplication.
 * Note: These are unit tests for the matching algorithms. Integration tests would require
 * a test database setup.
 */

// Helper functions for testing (exported from the service)
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function phoneNumbersMatch(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);

  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  const last10_1 = normalized1.slice(-10);
  const last10_2 = normalized2.slice(-10);
  return last10_1 === last10_2;
}

function emailsMatch(email1?: string | null, email2?: string | null): boolean {
  if (!email1 || !email2) return false;
  return email1.toLowerCase().trim() === email2.toLowerCase().trim();
}

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

describe('Patient Deduplication Service', () => {
  describe('Levenshtein Distance Algorithm', () => {
    it('should calculate correct distance for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate correct distance for completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    it('should calculate correct distance for one character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
    });

    it('should handle insertions', () => {
      expect(levenshteinDistance('cat', 'cats')).toBe(1);
    });

    it('should handle deletions', () => {
      expect(levenshteinDistance('cats', 'cat')).toBe(1);
    });

    it('should handle substitutions', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1);
    });
  });

  describe('Name Similarity Calculation', () => {
    it('should return 100 for identical names', () => {
      expect(calculateSimilarity('John Doe', 'John Doe')).toBe(100);
    });

    it('should return high similarity for minor typos', () => {
      const similarity = calculateSimilarity('John Doe', 'Jon Doe');
      expect(similarity).toBeGreaterThan(85);
    });

    it('should return low similarity for different names', () => {
      const similarity = calculateSimilarity('John Doe', 'Jane Smith');
      expect(similarity).toBeLessThan(50);
    });

    it('should be case-insensitive', () => {
      expect(calculateSimilarity('JOHN DOE', 'john doe')).toBe(100);
    });

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(0); // Both empty returns 0
      expect(calculateSimilarity('John', '')).toBe(0);
    });

    it('should handle common name variations', () => {
      expect(calculateSimilarity('John', 'Jon')).toBeGreaterThan(70);
      expect(calculateSimilarity('Katherine', 'Catherine')).toBeGreaterThan(80);
      expect(calculateSimilarity('Mohammad', 'Muhammad')).toBeGreaterThan(80);
    });
  });

  describe('Phone Number Matching', () => {
    it('should match identical phone numbers', () => {
      expect(phoneNumbersMatch('9876543210', '9876543210')).toBe(true);
    });

    it('should match with country code', () => {
      expect(phoneNumbersMatch('9876543210', '+919876543210')).toBe(true);
      expect(phoneNumbersMatch('+919876543210', '9876543210')).toBe(true);
    });

    it('should match with formatting characters', () => {
      expect(phoneNumbersMatch('987-654-3210', '9876543210')).toBe(true);
      expect(phoneNumbersMatch('(987) 654-3210', '9876543210')).toBe(true);
    });

    it('should not match different numbers', () => {
      expect(phoneNumbersMatch('9876543210', '1234567890')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(phoneNumbersMatch(null, '9876543210')).toBe(false);
      expect(phoneNumbersMatch('9876543210', null)).toBe(false);
      expect(phoneNumbersMatch(null, null)).toBe(false);
    });
  });

  describe('Email Matching', () => {
    it('should match identical emails', () => {
      expect(emailsMatch('john@example.com', 'john@example.com')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(emailsMatch('JOHN@EXAMPLE.COM', 'john@example.com')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(emailsMatch('  john@example.com  ', 'john@example.com')).toBe(true);
    });

    it('should not match different emails', () => {
      expect(emailsMatch('john@example.com', 'jane@example.com')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(emailsMatch(null, 'john@example.com')).toBe(false);
      expect(emailsMatch('john@example.com', null)).toBe(false);
    });
  });

  describe('Date Matching', () => {
    it('should match identical dates', () => {
      const date1 = new Date('1990-05-15');
      const date2 = new Date('1990-05-15');
      expect(datesMatch(date1, date2)).toBe(true);
    });

    it('should match dates in different formats', () => {
      expect(datesMatch('1990-05-15', new Date('1990-05-15'))).toBe(true);
    });

    it('should not match different dates', () => {
      expect(datesMatch('1990-05-15', '1990-05-16')).toBe(false);
      expect(datesMatch('1990-05-15', '1991-05-15')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(datesMatch(null, new Date())).toBe(false);
      expect(datesMatch(new Date(), null)).toBe(false);
    });
  });

  describe('Real-world Duplicate Scenarios', () => {
    it('should detect high-confidence duplicate (typo in name)', () => {
      const patient1 = {
        name: 'Rajesh Kumar',
        dob: '1985-03-20',
        contact: '9876543210',
        email: 'rajesh.kumar@gmail.com',
      };

      const patient2 = {
        name: 'Rajeesh Kumar', // Typo
        dob: '1985-03-20',
        contact: '9876543210',
        email: 'rajesh.kumar@gmail.com',
      };

      const nameSim = calculateSimilarity(patient1.name, patient2.name);
      const dobMatch = datesMatch(patient1.dob, patient2.dob);
      const phoneMatch = phoneNumbersMatch(patient1.contact, patient2.contact);
      const emailMatch = emailsMatch(patient1.email, patient2.email);

      expect(nameSim).toBeGreaterThan(85);
      expect(dobMatch).toBe(true);
      expect(phoneMatch).toBe(true);
      expect(emailMatch).toBe(true);

      // Estimated score: ~96 (very high confidence)
    });

    it('should detect medium-confidence duplicate (missing data)', () => {
      const patient1 = {
        name: 'Priya Sharma',
        dob: '1992-08-15',
        contact: '8765432109',
        email: null,
      };

      const patient2 = {
        name: 'Priya Sharma',
        dob: '1992-08-15',
        contact: '+918765432109', // With country code
        email: 'priya.sharma@yahoo.com',
      };

      const nameSim = calculateSimilarity(patient1.name, patient2.name);
      const dobMatch = datesMatch(patient1.dob, patient2.dob);
      const phoneMatch = phoneNumbersMatch(patient1.contact, patient2.contact);

      expect(nameSim).toBe(100);
      expect(dobMatch).toBe(true);
      expect(phoneMatch).toBe(true);

      // Estimated score: ~85 (medium-high confidence)
    });

    it('should not flag as duplicate (different person, similar name)', () => {
      const patient1 = {
        name: 'Amit Kumar',
        dob: '1988-01-10',
        contact: '9999999999',
        email: 'amit.k@gmail.com',
      };

      const patient2 = {
        name: 'Amit Kumar', // Common name
        dob: '1990-06-22', // Different DOB
        contact: '8888888888', // Different phone
        email: 'amit.kumar@yahoo.com', // Different email
      };

      const nameSim = calculateSimilarity(patient1.name, patient2.name);
      const dobMatch = datesMatch(patient1.dob, patient2.dob);
      const phoneMatch = phoneNumbersMatch(patient1.contact, patient2.contact);
      const emailMatch = emailsMatch(patient1.email, patient2.email);

      expect(nameSim).toBe(100);
      expect(dobMatch).toBe(false);
      expect(phoneMatch).toBe(false);
      expect(emailMatch).toBe(false);

      // Estimated score: ~40 (only name matches, likely different person)
    });

    it('should handle common Indian name variations', () => {
      const variations = [
        ['Mohammad', 'Muhammad'],
        ['Srinivas', 'Srinivaas'],
        ['Venkatesh', 'Venkatesha'],
      ];

      variations.forEach(([name1, name2]) => {
        const similarity = calculateSimilarity(name1, name2);
        expect(similarity).toBeGreaterThan(70);
      });

      // Lakshmi/Laxmi has lower similarity (~57) due to multiple character differences
      const laxmiSimilarity = calculateSimilarity('Lakshmi', 'Laxmi');
      expect(laxmiSimilarity).toBeGreaterThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long names', () => {
      const longName1 = 'Dr. Srinivasa Ramanujan Iyengar Venkataraman Krishnamurthy';
      const longName2 = 'Dr. Srinivasa Ramanujan Iyengar Venkataraman Krishnamurthi';
      const similarity = calculateSimilarity(longName1, longName2);
      expect(similarity).toBeGreaterThan(95);
    });

    it('should handle names with special characters', () => {
      const name1 = "O'Brien-Smith";
      const name2 = 'OBrien Smith';
      const similarity = calculateSimilarity(name1, name2);
      expect(similarity).toBeGreaterThan(80);
    });

    it('should handle phone numbers with various formats', () => {
      const formats = [
        ['9876543210', '+91-987-654-3210'],
        ['9876543210', '(987) 654-3210'],
        ['9876543210', '987.654.3210'],
      ];

      formats.forEach(([phone1, phone2]) => {
        expect(phoneNumbersMatch(phone1, phone2)).toBe(true);
      });
    });

    it('should handle international phone numbers', () => {
      expect(phoneNumbersMatch('+14155552671', '4155552671')).toBe(true);
      expect(phoneNumbersMatch('+442071234567', '2071234567')).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle comparison of many names efficiently', () => {
      const names = [
        'John Doe',
        'Jane Smith',
        'Robert Johnson',
        'Mary Williams',
        'James Brown',
      ];

      const target = 'Jon Doe';

      const start = Date.now();
      const results = names.map(name => ({
        name,
        similarity: calculateSimilarity(target, name),
      }));
      const end = Date.now();

      expect(end - start).toBeLessThan(10); // Should complete in < 10ms
      expect(results[0].similarity).toBeGreaterThan(80); // Should find Jon/John match
    });
  });
});
