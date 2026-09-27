/**
 * Case Service - Handles citizen case creation, tracking, and storage
 * 
 * Uses localStorage for prototype (no backend database required)
 * Provides deterministic spatial verification confidence calculation
 */

import { CitizenCase } from '../utils/types';

const CASE_STORAGE_KEY = 'aerobhumi_citizen_cases';

// CLEANUP: Remove old cases with stale image data from initial testing
// This ensures fresh start with no lingering old evidence images
if (typeof window !== 'undefined' && localStorage) {
  try {
    const stored = localStorage.getItem(CASE_STORAGE_KEY);
    if (stored) {
      console.log('🗑️  Clearing stale case history from localStorage');
      localStorage.removeItem(CASE_STORAGE_KEY);
      localStorage.removeItem('aerobhumi_case_counter');
      console.log('✅ Old cases removed - fresh start for new cases');
    }
  } catch (e) {
    console.warn('Warning: Could not clear old cases:', e);
  }
}

/**
 * Calculate spatial verification confidence based on available evidence
 * Returns deterministic score and level based on factors
 */
export function calculateSpatialConfidence(params: {
  outsidePercentage: number;
  affectedAreaM2: number;
  hasEvidenceSnapshot: boolean;
  auditResult: string;
}): { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW'; factors: string[] } {
  const factors: string[] = [];
  let score = 50; // Base score

  // Factor 1: Outside percentage (0-50 points)
  if (params.outsidePercentage > 20) {
    score += 30;
    factors.push('Significant boundary deviation (>20%)');
  } else if (params.outsidePercentage > 5) {
    score += 20;
    factors.push('Measurable boundary deviation (5-20%)');
  } else if (params.outsidePercentage > 0) {
    score += 10;
    factors.push('Minor boundary deviation detected');
  }

  // Factor 2: Affected area magnitude (0-20 points)
  if (params.affectedAreaM2 > 100) {
    score += 15;
    factors.push(`Large affected area (${params.affectedAreaM2} m²)`);
  } else if (params.affectedAreaM2 > 20) {
    score += 10;
    factors.push(`Moderate affected area (${params.affectedAreaM2} m²)`);
  } else if (params.affectedAreaM2 > 0) {
    score += 5;
    factors.push(`Small affected area (${params.affectedAreaM2} m²)`);
  }

  // Factor 3: Evidence snapshot (0-20 points)
  if (params.hasEvidenceSnapshot) {
    score += 15;
    factors.push('Citizen-provided evidence snapshot');
  }

  // Factor 4: Audit result classification (0-10 points)
  if (params.auditResult === 'POTENTIAL_BUILDING_ENCROACHMENT') {
    score += 10;
    factors.push('Verified spatial encroachment detected');
  }

  // Clamp score 0-100
  score = Math.min(100, Math.max(0, score));

  // Determine level
  let level: 'HIGH' | 'MEDIUM' | 'LOW';
  if (score >= 80) {
    level = 'HIGH';
  } else if (score >= 60) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return { score, level, factors };
}

/**
 * Get next case number from localStorage
 */
function getNextCaseNumber(): string {
  const stored = localStorage.getItem('aerobhumi_case_counter') || '0';
  const nextNum = parseInt(stored) + 1;
  localStorage.setItem('aerobhumi_case_counter', nextNum.toString());
  return String(nextNum).padStart(3, '0');
}

/**
 * Generate a unique government case ID
 */
export function generateCaseId(): string {
  const year = new Date().getFullYear();
  const caseNum = getNextCaseNumber();
  return `GOV-${year}-${caseNum}`;
}

/**
 * Create and save a new citizen case
 */
export function createCase(params: {
  parcelId: string;
  auditId: string;
  conflictResult: string;
  affectedAreaM2: number;
  outsidePercentage: number;
  reason: string;
  evidenceDataUrl?: string;
  evidenceFileName?: string;
}): CitizenCase {
  console.log('=== caseService.createCase called ===');
  console.log('params:', params);
  
  const caseId = generateCaseId();
  console.log('✅ Generated caseId:', caseId);
  
  const now = new Date().toISOString();

  // Calculate confidence
  const confidence = calculateSpatialConfidence({
    outsidePercentage: params.outsidePercentage,
    affectedAreaM2: params.affectedAreaM2,
    hasEvidenceSnapshot: !!params.evidenceDataUrl,
    auditResult: params.conflictResult,
  });
  
  console.log('✅ Calculated confidence:', confidence);

  // Estimate image data size
  let imageDataSize = 0;
  if (params.evidenceDataUrl) {
    imageDataSize = params.evidenceDataUrl.length;
    console.log('📊 Evidence image size:', imageDataSize, 'bytes');
  }

  // Check if evidence data is too large (localStorage typically 5-10MB per domain)
  // If total data exceeds ~4MB, skip the evidence data URL to save space
  let finalEvidenceDataUrl = params.evidenceDataUrl;
  if (imageDataSize > 2000000) {
    console.warn('⚠️  Evidence image too large (>2MB). Skipping image data to fit in localStorage.');
    finalEvidenceDataUrl = undefined; // Don't store the image, just store that there was evidence
  }

  const newCase: CitizenCase = {
    caseId,
    parcelId: params.parcelId,
    auditId: params.auditId,
    conflictResult: params.conflictResult,
    affectedAreaM2: params.affectedAreaM2,
    outsidePercentage: params.outsidePercentage,
    reason: params.reason,
    evidenceDataUrl: finalEvidenceDataUrl,
    evidenceFileName: params.evidenceFileName,
    spatialConfidence: confidence.score,
    confidenceLevel: confidence.level,
    confidenceFactors: confidence.factors,
    status: 'FLAGGED',
    createdAt: now,
    updatedAt: now,
  };

  // Save to localStorage
  console.log('💾 Saving to localStorage...');
  try {
    const cases = getAllCases();
    console.log('  Current cases:', cases.length);
    cases.push(newCase);
    console.log('  Total cases to save:', cases.length);
    
    const caseJsonSize = JSON.stringify(newCase).length;
    const casesJsonSize = JSON.stringify(cases).length;
    console.log('  Single case size:', caseJsonSize, 'bytes');
    console.log('  All cases total size:', casesJsonSize, 'bytes (~', Math.round(casesJsonSize / 1024), 'KB)');
    
    localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(cases));
    console.log('✅ Case saved to localStorage successfully');
    
    // Verify it was saved
    const verify = localStorage.getItem(CASE_STORAGE_KEY);
    console.log('✅ Verification: localStorage now contains:', verify ? 'YES - data present' : 'NO - data missing');
    if (verify) {
      const parsedVerify = JSON.parse(verify);
      console.log('✅ Verification: Found', parsedVerify.length, 'cases in localStorage');
    }
    
  } catch (err) {
    console.error('❌ ERROR saving to localStorage:', err);
    if (err instanceof Error) {
      console.error('  Error message:', err.message);
      if (err.message.includes('QuotaExceededError')) {
        console.error('  CAUSE: localStorage quota exceeded (too much data)');
        console.error('  SOLUTION: Image data too large, try without evidence or use smaller image');
      }
    }
    throw err; // Re-throw so caller knows it failed
  }

  return newCase;
}

/**
 * Get all citizen-created cases
 */
export function getAllCases(): CitizenCase[] {
  console.log('=== getAllCases called ===');
  
  // Debug: Log all localStorage keys
  console.log('  localStorage keys:', Object.keys(localStorage));
  
  const stored = localStorage.getItem(CASE_STORAGE_KEY);
  console.log('  Looking for key:', CASE_STORAGE_KEY);
  console.log('  localStorage value:', stored ? 'FOUND (' + stored.length + ' chars)' : 'NOT FOUND');
  
  if (!stored) {
    console.log('❌ No cases in localStorage');
    // Check if maybe it's stored under a different key
    const allKeys = Object.keys(localStorage);
    for (let key of allKeys) {
      if (key.includes('case') || key.includes('Case') || key.includes('citizen')) {
        console.log('  Found potential key:', key, '=', localStorage.getItem(key)?.substring(0, 100));
      }
    }
    return [];
  }
  try {
    const cases = JSON.parse(stored);
    console.log('✅ Parsed cases:', cases.length, 'cases');
    cases.forEach((c: any, i: number) => {
      console.log(`  [${i}] caseId: ${c.caseId}, parcelId: ${c.parcelId}, status: ${c.status}`);
    });
    return cases;
  } catch (err) {
    console.error('❌ Error parsing cases:', err);
    console.error('  Raw value:', stored);
    return [];
  }
}

/**
 * Get a specific case by ID
 */
export function getCaseById(caseId: string): CitizenCase | null {
  const cases = getAllCases();
  return cases.find((c) => c.caseId === caseId) || null;
}

/**
 * Update case status (government action)
 */
export function updateCaseStatus(
  caseId: string,
  newStatus: CitizenCase['status'],
  notes?: string
): CitizenCase | null {
  const cases = getAllCases();
  const caseIndex = cases.findIndex((c) => c.caseId === caseId);

  if (caseIndex === -1) return null;

  cases[caseIndex].status = newStatus;
  cases[caseIndex].updatedAt = new Date().toISOString();
  if (notes) {
    cases[caseIndex].governmentNotes = notes;
  }

  localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(cases));
  return cases[caseIndex];
}

/**
 * Export cases for government dashboard
 */
export function exportCasesForGovernment(): CitizenCase[] {
  return getAllCases();
}
