/**
 * Drug Interaction Checking Service
 * Provides drug-drug interaction checking and allergy validation
 */

import { prisma } from '../lib/db';

export type InteractionSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor';

export interface DrugInteraction {
  drug1Id: string;
  drug1Name: string;
  drug2Id: string;
  drug2Name: string;
  severity: InteractionSeverity;
  description: string;
  clinicalEffect: string;
  management: string;
}

export interface AllergyWarning {
  drugId: string;
  drugName: string;
  allergen: string;
  severity: 'high' | 'moderate' | 'low';
  recommendation: string;
}

export interface InteractionCheckResult {
  hasContraindications: boolean;
  hasMajorInteractions: boolean;
  interactions: DrugInteraction[];
  allergyWarnings: AllergyWarning[];
  canProceed: boolean;
  requiresOverride: boolean;
}

// Known drug interaction database (comprehensive clinical interactions)
// Based on clinical pharmacology guidelines and major drug interaction databases
const KNOWN_INTERACTIONS: Omit<DrugInteraction, 'drug1Id' | 'drug2Id'>[] = [
  // CONTRAINDICATED INTERACTIONS
  { drug1Name: 'Sildenafil', drug2Name: 'Nitroglycerin', severity: 'contraindicated', description: 'Profound hypotension', clinicalEffect: 'Severe hypotension, cardiovascular collapse', management: 'Absolute contraindication. Do not use together.' },
  { drug1Name: 'Methotrexate', drug2Name: 'Trimethoprim', severity: 'contraindicated', description: 'Severe bone marrow suppression', clinicalEffect: 'Pancytopenia, severe myelosuppression', management: 'Avoid combination. Use alternative antibiotics.' },
  { drug1Name: 'Cisapride', drug2Name: 'Erythromycin', severity: 'contraindicated', description: 'QT prolongation', clinicalEffect: 'Torsades de pointes, sudden cardiac death', management: 'Avoid combination completely.' },
  { drug1Name: 'Fluoxetine', drug2Name: 'MAO Inhibitors', severity: 'contraindicated', description: 'Serotonin syndrome', clinicalEffect: 'Life-threatening serotonin excess', management: 'Contraindicated - 5 week washout required' },
  { drug1Name: 'Fentanyl', drug2Name: 'Ritonavir', severity: 'contraindicated', description: 'Fatal respiratory depression', clinicalEffect: 'Ritonavir inhibits fentanyl metabolism', management: 'Contraindicated - use alternative opioid' },
  { drug1Name: 'Erythromycin', drug2Name: 'Simvastatin', severity: 'contraindicated', description: 'Rhabdomyolysis risk', clinicalEffect: 'Erythromycin strongly inhibits CYP3A4', management: 'Contraindicated - use alternative antibiotic' },
  { drug1Name: 'Allopurinol', drug2Name: 'Azathioprine', severity: 'contraindicated', description: 'Severe bone marrow suppression', clinicalEffect: 'Allopurinol inhibits azathioprine metabolism', management: 'Reduce azathioprine dose by 75% or avoid' },
  { drug1Name: 'Colchicine', drug2Name: 'Clarithromycin', severity: 'contraindicated', description: 'Fatal colchicine toxicity', clinicalEffect: 'Pancytopenia, multi-organ failure', management: 'Avoid combination especially with renal/hepatic disease.' },
  { drug1Name: 'Ergotamine', drug2Name: 'Clarithromycin', severity: 'contraindicated', description: 'Ergot toxicity', clinicalEffect: 'Severe vasospasm, ischemia, gangrene', management: 'Absolute contraindication. Use alternative antibiotic.' },
  { drug1Name: 'Ceftriaxone', drug2Name: 'Calcium', severity: 'contraindicated', description: 'Fatal precipitation in neonates', clinicalEffect: 'Pulmonary and renal precipitation, death', management: 'Never mix in patients <28 days old.' },

  // MAJOR INTERACTIONS - Anticoagulants
  { drug1Name: 'Warfarin', drug2Name: 'Aspirin', severity: 'major', description: 'Increased bleeding risk', clinicalEffect: 'Enhanced anticoagulation and GI bleeding risk', management: 'Avoid combination or monitor closely with INR checks' },
  { drug1Name: 'Warfarin', drug2Name: 'Ibuprofen', severity: 'major', description: 'Increased bleeding risk', clinicalEffect: 'NSAIDs inhibit platelet function and increase GI bleeding', management: 'Use acetaminophen instead if possible' },
  { drug1Name: 'Warfarin', drug2Name: 'Metronidazole', severity: 'major', description: 'Increased INR', clinicalEffect: 'Metronidazole inhibits warfarin metabolism', management: 'Reduce warfarin dose by 25-50%, monitor INR' },
  { drug1Name: 'Warfarin', drug2Name: 'Ciprofloxacin', severity: 'major', description: 'Fluoroquinolones inhibit warfarin metabolism', clinicalEffect: 'Increased bleeding risk, elevated INR', management: 'Monitor INR closely. May need to reduce warfarin dose by 25-50%.' },
  { drug1Name: 'Warfarin', drug2Name: 'Amiodarone', severity: 'major', description: 'Amiodarone inhibits warfarin metabolism', clinicalEffect: 'Significantly elevated INR, bleeding risk', management: 'Reduce warfarin dose by 30-50%. Monitor INR weekly.' },
  { drug1Name: 'Warfarin', drug2Name: 'Rifampin', severity: 'major', description: 'Rifampin induces warfarin metabolism', clinicalEffect: 'Decreased INR, loss of anticoagulation', management: 'May need to increase warfarin dose. Monitor INR closely.' },
  { drug1Name: 'Clopidogrel', drug2Name: 'Omeprazole', severity: 'major', description: 'Reduced clopidogrel efficacy', clinicalEffect: 'Omeprazole inhibits CYP2C19, reducing active metabolite', management: 'Use pantoprazole or H2 blocker instead' },
  { drug1Name: 'Clopidogrel', drug2Name: 'Esomeprazole', severity: 'major', description: 'Reduced clopidogrel efficacy', clinicalEffect: 'PPI inhibits CYP2C19 activation', management: 'Use H2 blocker or pantoprazole' },

  // MAJOR INTERACTIONS - Cardiac drugs
  { drug1Name: 'Digoxin', drug2Name: 'Amiodarone', severity: 'major', description: 'Digoxin toxicity risk', clinicalEffect: 'Amiodarone increases digoxin levels by 70-100%', management: 'Reduce digoxin dose by 50%, monitor levels' },
  { drug1Name: 'Digoxin', drug2Name: 'Verapamil', severity: 'major', description: 'Increased digoxin levels', clinicalEffect: 'Verapamil inhibits P-glycoprotein efflux', management: 'Reduce digoxin dose by 25-50%, monitor for bradycardia' },
  { drug1Name: 'Digoxin', drug2Name: 'Quinidine', severity: 'major', description: 'Quinidine doubles digoxin levels', clinicalEffect: 'Severe digoxin toxicity', management: 'Reduce digoxin dose by 50%. Monitor levels closely.' },
  { drug1Name: 'Metoprolol', drug2Name: 'Verapamil', severity: 'major', description: 'Severe bradycardia/heart block', clinicalEffect: 'Additive AV node depression', management: 'Avoid combination, monitor ECG if necessary' },
  { drug1Name: 'Clonidine', drug2Name: 'Beta Blockers', severity: 'major', description: 'Severe rebound hypertension risk', clinicalEffect: 'Severe hypertensive crisis if clonidine stopped abruptly', management: 'Taper clonidine slowly. Discontinue beta-blocker first.' },

  // MAJOR INTERACTIONS - Antibiotics
  { drug1Name: 'Ciprofloxacin', drug2Name: 'Theophylline', severity: 'major', description: 'Theophylline toxicity', clinicalEffect: 'Ciprofloxacin inhibits theophylline metabolism', management: 'Reduce theophylline dose by 50%, monitor levels' },
  { drug1Name: 'Metronidazole', drug2Name: 'Alcohol', severity: 'major', description: 'Disulfiram-like reaction', clinicalEffect: 'Nausea, vomiting, flushing, headache', management: 'Avoid alcohol during and 48 hours after treatment' },
  { drug1Name: 'Clarithromycin', drug2Name: 'Simvastatin', severity: 'major', description: 'Macrolides inhibit statin metabolism', clinicalEffect: 'Rhabdomyolysis, myopathy', management: 'Suspend statin during clarithromycin course or use azithromycin.' },
  { drug1Name: 'Ketoconazole', drug2Name: 'Simvastatin', severity: 'major', description: 'Azole antifungals significantly increase statin levels', clinicalEffect: 'Severe rhabdomyolysis risk', management: 'Avoid combination. Suspend statin during azole therapy.' },

  // MAJOR INTERACTIONS - CNS drugs
  { drug1Name: 'Tramadol', drug2Name: 'SSRI', severity: 'major', description: 'Serotonin syndrome risk', clinicalEffect: 'Both drugs increase serotonin', management: 'Use lowest effective doses. Monitor for serotonin syndrome.' },
  { drug1Name: 'Carbamazepine', drug2Name: 'Oral Contraceptives', severity: 'major', description: 'Contraceptive failure', clinicalEffect: 'Enzyme induction reduces contraceptive efficacy', management: 'Use additional contraception or non-hormonal methods.' },
  { drug1Name: 'Phenytoin', drug2Name: 'Oral Contraceptives', severity: 'major', description: 'Contraceptive failure', clinicalEffect: 'Enzyme induction reduces contraceptive efficacy', management: 'Use additional contraception or non-hormonal methods.' },
  { drug1Name: 'Phenytoin', drug2Name: 'Fluconazole', severity: 'major', description: 'Azoles inhibit phenytoin metabolism', clinicalEffect: 'Phenytoin toxicity: ataxia, nystagmus, confusion', management: 'Monitor phenytoin levels. May need 30-50% dose reduction.' },
  { drug1Name: 'Phenytoin', drug2Name: 'Warfarin', severity: 'major', description: 'Altered anticoagulation', clinicalEffect: 'Complex interaction affecting both drugs', management: 'Monitor INR and phenytoin levels' },
  { drug1Name: 'Haloperidol', drug2Name: 'Levodopa', severity: 'major', description: 'Antipsychotics block dopamine receptors', clinicalEffect: 'Loss of Parkinson control, severe rigidity', management: 'Avoid typical antipsychotics. Use quetiapine if needed.' },
  { drug1Name: 'Fluoxetine', drug2Name: 'Tamoxifen', severity: 'major', description: 'SSRIs inhibit tamoxifen activation', clinicalEffect: 'Reduced breast cancer treatment efficacy', management: 'Use alternative antidepressant (venlafaxine, citalopram).' },
  { drug1Name: 'Paroxetine', drug2Name: 'Tamoxifen', severity: 'major', description: 'Strong CYP2D6 inhibition', clinicalEffect: 'Reduced breast cancer treatment efficacy', management: 'Avoid paroxetine. Use escitalopram or venlafaxine.' },
  { drug1Name: 'Morphine', drug2Name: 'Benzodiazepines', severity: 'major', description: 'Respiratory depression', clinicalEffect: 'Additive CNS depression', management: 'Use lowest effective doses, monitor closely' },

  // MAJOR INTERACTIONS - Diabetes drugs
  { drug1Name: 'Metformin', drug2Name: 'Contrast Dye', severity: 'major', description: 'Lactic acidosis risk', clinicalEffect: 'Contrast may cause renal impairment and lactic acidosis', management: 'Hold metformin 48h before/after contrast. Check renal function.' },
  { drug1Name: 'Sulfonylureas', drug2Name: 'Fluconazole', severity: 'major', description: 'Hypoglycemia', clinicalEffect: 'Fluconazole inhibits sulfonylurea metabolism', management: 'Monitor blood glucose closely. Consider dose reduction.' },
  { drug1Name: 'Sulfonylurea', drug2Name: 'Clarithromycin', severity: 'moderate', description: 'Macrolides increase sulfonylurea levels', clinicalEffect: 'Severe hypoglycemia', management: 'Monitor blood glucose closely. Consider dose reduction or azithromycin.' },

  // MAJOR INTERACTIONS - Potassium/Electrolytes
  { drug1Name: 'ACE Inhibitors', drug2Name: 'Potassium Supplements', severity: 'major', description: 'Hyperkalemia', clinicalEffect: 'ACE inhibitors reduce potassium excretion', management: 'Monitor potassium levels regularly' },
  { drug1Name: 'Spironolactone', drug2Name: 'ACE Inhibitors', severity: 'major', description: 'Severe hyperkalemia', clinicalEffect: 'Additive potassium retention, arrhythmias, cardiac arrest', management: 'Monitor potassium weekly initially, then monthly.' },
  { drug1Name: 'Lisinopril', drug2Name: 'NSAIDs', severity: 'moderate', description: 'NSAIDs reduce ACE inhibitor efficacy', clinicalEffect: 'Reduced BP control, acute kidney injury', management: 'Monitor BP and renal function. Use lowest NSAID dose.' },

  // MAJOR INTERACTIONS - Immunosuppressants
  { drug1Name: 'Methotrexate', drug2Name: 'NSAIDs', severity: 'major', description: 'NSAIDs reduce methotrexate clearance', clinicalEffect: 'Methotrexate toxicity: myelosuppression, hepatotoxicity', management: 'Avoid NSAIDs with high-dose methotrexate. Monitor CBC, LFTs.' },
  { drug1Name: 'Cyclosporine', drug2Name: 'Simvastatin', severity: 'major', description: 'Cyclosporine increases statin levels', clinicalEffect: 'Severe rhabdomyolysis, acute kidney injury', management: 'Limit simvastatin to 10mg daily or use pravastatin.' },

  // MAJOR INTERACTIONS - Pain/Psychiatric
  { drug1Name: 'Lithium', drug2Name: 'NSAIDs', severity: 'major', description: 'Lithium toxicity', clinicalEffect: 'NSAIDs reduce lithium excretion', management: 'Use acetaminophen, monitor lithium levels weekly.' },
  { drug1Name: 'Lithium', drug2Name: 'ACE Inhibitors', severity: 'major', description: 'Lithium toxicity', clinicalEffect: 'ACE inhibitors reduce lithium excretion', management: 'Monitor lithium levels closely' },

  // MODERATE INTERACTIONS
  { drug1Name: 'Warfarin', drug2Name: 'Amoxicillin', severity: 'moderate', description: 'Antibiotics alter gut flora', clinicalEffect: 'Modest INR increase', management: 'Monitor INR 3-5 days after starting antibiotic.' },
  { drug1Name: 'Levothyroxine', drug2Name: 'Calcium Supplements', severity: 'moderate', description: 'Calcium chelates levothyroxine', clinicalEffect: 'Reduced thyroid hormone levels', management: 'Separate doses by 4 hours. Monitor TSH.' },
  { drug1Name: 'Levothyroxine', drug2Name: 'Iron Supplements', severity: 'moderate', description: 'Iron chelates levothyroxine', clinicalEffect: 'Reduced thyroid hormone levels', management: 'Separate doses by 4 hours. Monitor TSH.' },
  { drug1Name: 'Alendronate', drug2Name: 'Calcium', severity: 'moderate', description: 'Calcium reduces bisphosphonate absorption', clinicalEffect: 'Reduced osteoporosis treatment efficacy', management: 'Take alendronate 30 minutes before calcium on empty stomach.' },
  { drug1Name: 'Tetracycline', drug2Name: 'Iron', severity: 'moderate', description: 'Divalent cations chelate tetracyclines', clinicalEffect: 'Reduced antibiotic efficacy', management: 'Separate doses by 2-3 hours.' },
  { drug1Name: 'Ciprofloxacin', drug2Name: 'Antacids', severity: 'moderate', description: 'Reduced ciprofloxacin absorption', clinicalEffect: 'Divalent cations bind to fluoroquinolones', management: 'Give ciprofloxacin 2h before or 6h after antacids' },
  { drug1Name: 'Prednisone', drug2Name: 'NSAIDs', severity: 'moderate', description: 'Increased GI bleeding risk', clinicalEffect: 'GI bleeding, peptic ulcer disease', management: 'Add PPI for gastroprotection.' },
  { drug1Name: 'Furosemide', drug2Name: 'Gentamicin', severity: 'moderate', description: 'Both drugs are ototoxic and nephrotoxic', clinicalEffect: 'Increased risk of hearing loss and kidney damage', management: 'Monitor renal function and gentamicin levels.' },
  { drug1Name: 'Losartan', drug2Name: 'Spironolactone', severity: 'moderate', description: 'Additive hyperkalemia risk', clinicalEffect: 'Hyperkalemia, especially with renal impairment', management: 'Monitor potassium levels monthly.' },
  { drug1Name: 'Metoprolol', drug2Name: 'Verapamil', severity: 'moderate', description: 'Additive bradycardia', clinicalEffect: 'Severe bradycardia, heart block', management: 'Monitor heart rate and blood pressure.' },
  { drug1Name: 'Insulin', drug2Name: 'Beta Blockers', severity: 'moderate', description: 'Masked hypoglycemia', clinicalEffect: 'Beta blockers mask hypoglycemia symptoms', management: 'Use cardioselective beta-blockers. Educate patient.' },
  { drug1Name: 'Allopurinol', drug2Name: 'Azathioprine', severity: 'moderate', description: 'Allopurinol inhibits azathioprine metabolism', clinicalEffect: 'Severe myelosuppression', management: 'Reduce azathioprine dose by 75%. Monitor CBC weekly.' },
  { drug1Name: 'Metoclopramide', drug2Name: 'Levodopa', severity: 'moderate', description: 'Metoclopramide antagonizes dopamine', clinicalEffect: 'Worsening Parkinson symptoms', management: 'Avoid metoclopramide. Use domperidone or ondansetron.' },
  { drug1Name: 'Fentanyl', drug2Name: 'Fluconazole', severity: 'moderate', description: 'Azoles increase opioid levels', clinicalEffect: 'Respiratory depression, excessive sedation', management: 'Reduce opioid dose. Monitor respiratory rate.' },
  { drug1Name: 'Diltiazem', drug2Name: 'Simvastatin', severity: 'moderate', description: 'CCBs increase statin levels', clinicalEffect: 'Increased myopathy risk', management: 'Limit simvastatin to 10-20mg daily.' },
  { drug1Name: 'Amlodipine', drug2Name: 'Simvastatin', severity: 'moderate', description: 'Increased statin levels', clinicalEffect: 'Risk of myopathy/rhabdomyolysis', management: 'Limit simvastatin to 20mg daily' },
  { drug1Name: 'Spironolactone', drug2Name: 'Trimethoprim', severity: 'moderate', description: 'Both drugs increase potassium', clinicalEffect: 'Hyperkalemia', management: 'Monitor potassium levels closely.' },

  // MINOR INTERACTIONS
  { drug1Name: 'Acetaminophen', drug2Name: 'Warfarin', severity: 'minor', description: 'Chronic high-dose acetaminophen may increase INR', clinicalEffect: 'Small INR increase with chronic use >2g/day', management: 'Safe for occasional use. Monitor INR if chronic high-dose.' },
  { drug1Name: 'Omeprazole', drug2Name: 'Clopidogrel', severity: 'minor', description: 'PPIs may reduce clopidogrel activation', clinicalEffect: 'Potentially reduced antiplatelet effect', management: 'Consider pantoprazole or H2 blocker.' },
  { drug1Name: 'Atorvastatin', drug2Name: 'Grapefruit Juice', severity: 'minor', description: 'Grapefruit inhibits statin metabolism', clinicalEffect: 'Increased statin levels, myopathy risk', management: 'Avoid grapefruit or use alternative statin.' },
  { drug1Name: 'Antacid', drug2Name: 'Levothyroxine', severity: 'minor', description: 'Aluminum/magnesium reduce absorption', clinicalEffect: 'Slightly reduced thyroid hormone levels', management: 'Separate doses by 2-4 hours.' },
  { drug1Name: 'Propranolol', drug2Name: 'Antacid', severity: 'minor', description: 'Antacids may reduce beta-blocker absorption', clinicalEffect: 'Slightly reduced beta-blocker effect', management: 'Separate administration by 2 hours.' },
];

// Common drug-allergy cross-reactivity patterns
const ALLERGY_PATTERNS: { allergen: string; drugs: string[]; severity: 'high' | 'moderate' | 'low' }[] = [
  { allergen: 'Penicillin', drugs: ['Amoxicillin', 'Ampicillin', 'Piperacillin', 'Penicillin V', 'Penicillin G'], severity: 'high' },
  { allergen: 'Penicillin', drugs: ['Cephalexin', 'Cefuroxime', 'Ceftriaxone', 'Cefazolin'], severity: 'moderate' }, // Cross-reactivity ~1-2%
  { allergen: 'Sulfa', drugs: ['Sulfamethoxazole', 'Trimethoprim-Sulfamethoxazole', 'Sulfasalazine'], severity: 'high' },
  { allergen: 'Sulfa', drugs: ['Furosemide', 'Thiazides', 'Celecoxib'], severity: 'low' }, // Structural similarity but low cross-reactivity
  { allergen: 'Aspirin', drugs: ['Ibuprofen', 'Naproxen', 'Ketorolac', 'Diclofenac'], severity: 'moderate' },
  { allergen: 'NSAIDs', drugs: ['Aspirin', 'Ibuprofen', 'Naproxen', 'Ketorolac', 'Diclofenac', 'Indomethacin'], severity: 'high' },
  { allergen: 'Codeine', drugs: ['Morphine', 'Hydrocodone', 'Oxycodone'], severity: 'moderate' },
  { allergen: 'Latex', drugs: ['N/A'], severity: 'low' }, // For awareness in procedures
  { allergen: 'Iodine', drugs: ['Contrast Dye', 'Povidone-Iodine'], severity: 'high' },
  { allergen: 'Eggs', drugs: ['Propofol', 'Influenza Vaccine'], severity: 'moderate' },
  { allergen: 'ACE Inhibitor', drugs: ['Lisinopril', 'Enalapril', 'Ramipril', 'Captopril'], severity: 'high' },
  { allergen: 'Statin', drugs: ['Atorvastatin', 'Simvastatin', 'Rosuvastatin', 'Pravastatin'], severity: 'moderate' },
];

/**
 * Normalize drug name for matching
 */
function normalizeDrugName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/hydrochloride|hcl|sodium|potassium|acetate|sulfate/g, '');
}

/**
 * Check if two drug names match (fuzzy matching)
 */
function drugNamesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeDrugName(name1);
  const n2 = normalizeDrugName(name2);
  return n1.includes(n2) || n2.includes(n1) || n1 === n2;
}

/**
 * Check drug interactions between multiple drugs
 */
export async function checkDrugInteractions(
  drugIds: string[],
  patientAllergies?: string
): Promise<InteractionCheckResult> {
  const interactions: DrugInteraction[] = [];
  const allergyWarnings: AllergyWarning[] = [];

  if (drugIds.length < 2 && !patientAllergies) {
    return {
      hasContraindications: false,
      hasMajorInteractions: false,
      interactions: [],
      allergyWarnings: [],
      canProceed: true,
      requiresOverride: false,
    };
  }

  // Fetch drug details
  const drugs = await prisma.drug.findMany({
    where: { id: { in: drugIds } },
    select: { id: true, name: true, genericName: true, category: true },
  });

  // Check for drug-drug interactions
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const drug1 = drugs[i];
      const drug2 = drugs[j];

      // Check both drug name and generic name
      for (const knownInteraction of KNOWN_INTERACTIONS) {
        const match1to2 = (drugNamesMatch(drug1.name, knownInteraction.drug1Name) || drugNamesMatch(drug1.genericName, knownInteraction.drug1Name)) &&
                          (drugNamesMatch(drug2.name, knownInteraction.drug2Name) || drugNamesMatch(drug2.genericName, knownInteraction.drug2Name));
        const match2to1 = (drugNamesMatch(drug2.name, knownInteraction.drug1Name) || drugNamesMatch(drug2.genericName, knownInteraction.drug1Name)) &&
                          (drugNamesMatch(drug1.name, knownInteraction.drug2Name) || drugNamesMatch(drug1.genericName, knownInteraction.drug2Name));

        if (match1to2 || match2to1) {
          interactions.push({
            drug1Id: drug1.id,
            drug1Name: drug1.name,
            drug2Id: drug2.id,
            drug2Name: drug2.name,
            severity: knownInteraction.severity,
            description: knownInteraction.description,
            clinicalEffect: knownInteraction.clinicalEffect,
            management: knownInteraction.management,
          });
        }
      }
    }
  }

  // Check for allergy conflicts
  if (patientAllergies) {
    const allergies = patientAllergies.split(',').map(a => a.trim().toLowerCase());

    for (const drug of drugs) {
      for (const pattern of ALLERGY_PATTERNS) {
        // Check if patient has this allergy
        const hasAllergy = allergies.some(a =>
          a.includes(pattern.allergen.toLowerCase()) ||
          pattern.allergen.toLowerCase().includes(a)
        );

        if (hasAllergy) {
          // Check if current drug is in the risk list
          const isRiskDrug = pattern.drugs.some(d =>
            drugNamesMatch(drug.name, d) || drugNamesMatch(drug.genericName, d)
          );

          if (isRiskDrug) {
            allergyWarnings.push({
              drugId: drug.id,
              drugName: drug.name,
              allergen: pattern.allergen,
              severity: pattern.severity,
              recommendation: pattern.severity === 'high'
                ? `AVOID: Patient allergic to ${pattern.allergen}. High cross-reactivity risk.`
                : pattern.severity === 'moderate'
                ? `CAUTION: Patient allergic to ${pattern.allergen}. Consider alternative or monitor closely.`
                : `NOTE: Patient allergic to ${pattern.allergen}. Low cross-reactivity but be aware.`,
            });
          }
        }
      }
    }
  }

  const hasContraindications = interactions.some(i => i.severity === 'contraindicated') ||
                               allergyWarnings.some(a => a.severity === 'high');
  const hasMajorInteractions = interactions.some(i => i.severity === 'major');

  return {
    hasContraindications,
    hasMajorInteractions,
    interactions,
    allergyWarnings,
    canProceed: !hasContraindications,
    requiresOverride: hasContraindications || hasMajorInteractions || allergyWarnings.some(a => a.severity === 'high'),
  };
}

/**
 * Check allergy conflicts for a single drug
 */
export async function checkAllergyConflicts(
  drugId: string,
  allergies: string
): Promise<AllergyWarning[]> {
  const warnings: AllergyWarning[] = [];

  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    select: { id: true, name: true, genericName: true },
  });

  if (!drug) return warnings;

  const allergyList = allergies.split(',').map(a => a.trim().toLowerCase());

  for (const pattern of ALLERGY_PATTERNS) {
    const hasAllergy = allergyList.some(a =>
      a.includes(pattern.allergen.toLowerCase()) ||
      pattern.allergen.toLowerCase().includes(a)
    );

    if (hasAllergy) {
      const isRiskDrug = pattern.drugs.some(d =>
        drugNamesMatch(drug.name, d) || drugNamesMatch(drug.genericName, d)
      );

      if (isRiskDrug) {
        warnings.push({
          drugId: drug.id,
          drugName: drug.name,
          allergen: pattern.allergen,
          severity: pattern.severity,
          recommendation: pattern.severity === 'high'
            ? `AVOID: Patient allergic to ${pattern.allergen}. High cross-reactivity risk.`
            : pattern.severity === 'moderate'
            ? `CAUTION: Patient allergic to ${pattern.allergen}. Consider alternative.`
            : `NOTE: Patient allergic to ${pattern.allergen}. Low cross-reactivity.`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Get all known interactions for a specific drug
 */
export async function getDrugInteractions(drugId: string): Promise<Omit<DrugInteraction, 'drug1Id' | 'drug2Id'>[]> {
  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    select: { name: true, genericName: true },
  });

  if (!drug) return [];

  const relevantInteractions: Omit<DrugInteraction, 'drug1Id' | 'drug2Id'>[] = [];

  for (const interaction of KNOWN_INTERACTIONS) {
    if (drugNamesMatch(drug.name, interaction.drug1Name) ||
        drugNamesMatch(drug.genericName, interaction.drug1Name) ||
        drugNamesMatch(drug.name, interaction.drug2Name) ||
        drugNamesMatch(drug.genericName, interaction.drug2Name)) {
      relevantInteractions.push({
        drug1Name: interaction.drug1Name,
        drug2Name: interaction.drug2Name,
        severity: interaction.severity,
        description: interaction.description,
        clinicalEffect: interaction.clinicalEffect,
        management: interaction.management,
      });
    }
  }

  return relevantInteractions;
}

export default {
  checkDrugInteractions,
  checkAllergyConflicts,
  getDrugInteractions,
};
