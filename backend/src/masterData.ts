// Master Data for seeding - comprehensive hospital data

export const DRUGS = [
  // Antibiotics
  { name: 'Amoxicillin', genericName: 'Amoxicillin', form: 'Capsule', strength: '500mg', category: 'Antibiotic', isNarcotic: false, price: 5 },
  { name: 'Azithromycin', genericName: 'Azithromycin', form: 'Tablet', strength: '500mg', category: 'Antibiotic', isNarcotic: false, price: 15 },
  { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin', form: 'Tablet', strength: '500mg', category: 'Antibiotic', isNarcotic: false, price: 8 },
  { name: 'Ceftriaxone', genericName: 'Ceftriaxone', form: 'Injection', strength: '1g', category: 'Antibiotic', isNarcotic: false, price: 45 },

  // Pain & Fever
  { name: 'Paracetamol', genericName: 'Paracetamol', form: 'Tablet', strength: '500mg', category: 'Analgesic', isNarcotic: false, price: 2 },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', form: 'Tablet', strength: '400mg', category: 'NSAID', isNarcotic: false, price: 3 },
  { name: 'Diclofenac', genericName: 'Diclofenac', form: 'Tablet', strength: '50mg', category: 'NSAID', isNarcotic: false, price: 4 },
  { name: 'Tramadol', genericName: 'Tramadol', form: 'Tablet', strength: '50mg', category: 'Analgesic', isNarcotic: true, price: 12 },
  { name: 'Morphine', genericName: 'Morphine', form: 'Injection', strength: '10mg', category: 'Narcotic Analgesic', isNarcotic: true, price: 85 },

  // Cardiovascular
  { name: 'Atenolol', genericName: 'Atenolol', form: 'Tablet', strength: '50mg', category: 'Beta Blocker', isNarcotic: false, price: 6 },
  { name: 'Amlodipine', genericName: 'Amlodipine', form: 'Tablet', strength: '5mg', category: 'Calcium Channel Blocker', isNarcotic: false, price: 7 },
  { name: 'Aspirin', genericName: 'Aspirin', form: 'Tablet', strength: '75mg', category: 'Antiplatelet', isNarcotic: false, price: 2 },
  { name: 'Atorvastatin', genericName: 'Atorvastatin', form: 'Tablet', strength: '10mg', category: 'Statin', isNarcotic: false, price: 9 },

  // Diabetes
  { name: 'Metformin', genericName: 'Metformin', form: 'Tablet', strength: '500mg', category: 'Antidiabetic', isNarcotic: false, price: 3 },
  { name: 'Glimepiride', genericName: 'Glimepiride', form: 'Tablet', strength: '2mg', category: 'Antidiabetic', isNarcotic: false, price: 5 },
  { name: 'Insulin Glargine', genericName: 'Insulin Glargine', form: 'Injection', strength: '100IU/ml', category: 'Insulin', isNarcotic: false, price: 450 },

  // GI & Anti-emetics
  { name: 'Omeprazole', genericName: 'Omeprazole', form: 'Capsule', strength: '20mg', category: 'PPI', isNarcotic: false, price: 6 },
  { name: 'Ranitidine', genericName: 'Ranitidine', form: 'Tablet', strength: '150mg', category: 'H2 Blocker', isNarcotic: false, price: 4 },
  { name: 'Ondansetron', genericName: 'Ondansetron', form: 'Tablet', strength: '4mg', category: 'Antiemetic', isNarcotic: false, price: 8 },

  // Respiratory
  { name: 'Salbutamol', genericName: 'Salbutamol', form: 'Inhaler', strength: '100mcg', category: 'Bronchodilator', isNarcotic: false, price: 120 },
  { name: 'Montelukast', genericName: 'Montelukast', form: 'Tablet', strength: '10mg', category: 'Leukotriene Inhibitor', isNarcotic: false, price: 15 },

  // IV Fluids
  { name: 'Normal Saline', genericName: 'Sodium Chloride 0.9%', form: 'IV Fluid', strength: '500ml', category: 'IV Fluid', isNarcotic: false, price: 45 },
  { name: 'Ringer Lactate', genericName: 'Ringer Lactate', form: 'IV Fluid', strength: '500ml', category: 'IV Fluid', isNarcotic: false, price: 50 },
  { name: 'Dextrose 5%', genericName: 'Dextrose', form: 'IV Fluid', strength: '500ml', category: 'IV Fluid', isNarcotic: false, price: 48 },
];

export const LAB_TESTS = [
  // Hematology
  { name: 'Complete Blood Count (CBC)', code: 'CBC', category: 'Hematology', price: 350, tat: 4, unit: '' },
  { name: 'Hemoglobin', code: 'HB', category: 'Hematology', price: 100, tat: 2, unit: 'g/dL' },
  { name: 'ESR', code: 'ESR', category: 'Hematology', price: 120, tat: 2, unit: 'mm/hr' },
  { name: 'Platelet Count', code: 'PLT', category: 'Hematology', price: 150, tat: 3, unit: 'lakhs/cumm' },

  // Biochemistry
  { name: 'Blood Sugar (Fasting)', code: 'FBS', category: 'Biochemistry', price: 80, tat: 2, unit: 'mg/dL' },
  { name: 'Blood Sugar (Random)', code: 'RBS', category: 'Biochemistry', price: 80, tat: 2, unit: 'mg/dL' },
  { name: 'HbA1c', code: 'HBA1C', category: 'Biochemistry', price: 450, tat: 6, unit: '%' },
  { name: 'Lipid Profile', code: 'LIPID', category: 'Biochemistry', price: 600, tat: 6, unit: '' },
  { name: 'Liver Function Test (LFT)', code: 'LFT', category: 'Biochemistry', price: 550, tat: 6, unit: '' },
  { name: 'Kidney Function Test (KFT)', code: 'KFT', category: 'Biochemistry', price: 500, tat: 6, unit: '' },
  { name: 'Serum Creatinine', code: 'CREAT', category: 'Biochemistry', price: 200, tat: 4, unit: 'mg/dL' },
  { name: 'Blood Urea', code: 'UREA', category: 'Biochemistry', price: 180, tat: 4, unit: 'mg/dL' },
  { name: 'Uric Acid', code: 'URIC', category: 'Biochemistry', price: 200, tat: 4, unit: 'mg/dL' },

  // Thyroid
  { name: 'Thyroid Profile (Total)', code: 'THYROID', category: 'Hormones', price: 650, tat: 24, unit: '' },
  { name: 'TSH', code: 'TSH', category: 'Hormones', price: 250, tat: 12, unit: 'mIU/L' },
  { name: 'T3', code: 'T3', category: 'Hormones', price: 200, tat: 12, unit: 'ng/dL' },
  { name: 'T4', code: 'T4', category: 'Hormones', price: 200, tat: 12, unit: 'μg/dL' },

  // Serology
  { name: 'HIV (ELISA)', code: 'HIV', category: 'Serology', price: 400, tat: 24, unit: '' },
  { name: 'HBsAg', code: 'HBSAG', category: 'Serology', price: 350, tat: 6, unit: '' },
  { name: 'Anti HCV', code: 'HCV', category: 'Serology', price: 450, tat: 24, unit: '' },
  { name: 'VDRL', code: 'VDRL', category: 'Serology', price: 200, tat: 4, unit: '' },
  { name: 'Dengue NS1', code: 'DENGUE', category: 'Serology', price: 800, tat: 6, unit: '' },
  { name: 'Malaria Antigen', code: 'MALARIA', category: 'Serology', price: 300, tat: 2, unit: '' },

  // Urine
  { name: 'Urine Routine', code: 'URINE', category: 'Urine', price: 150, tat: 2, unit: '' },
  { name: 'Urine Culture', code: 'UCULTURE', category: 'Microbiology', price: 550, tat: 48, unit: '' },

  // Microbiology
  { name: 'Blood Culture', code: 'BCULTURE', category: 'Microbiology', price: 650, tat: 72, unit: '' },
  { name: 'Sputum Culture', code: 'SCULTURE', category: 'Microbiology', price: 500, tat: 72, unit: '' },
];

export const RADIOLOGY_TESTS = [
  // X-Ray
  { name: 'Chest X-Ray (PA View)', code: 'CXR-PA', modality: 'X-Ray', price: 300, tat: 2 },
  { name: 'Chest X-Ray (AP View)', code: 'CXR-AP', modality: 'X-Ray', price: 300, tat: 2 },
  { name: 'Abdomen X-Ray', code: 'AXR', modality: 'X-Ray', price: 350, tat: 2 },
  { name: 'Skull X-Ray', code: 'SKULL', modality: 'X-Ray', price: 400, tat: 2 },
  { name: 'Spine X-Ray (Cervical)', code: 'SPINE-C', modality: 'X-Ray', price: 450, tat: 2 },
  { name: 'Spine X-Ray (Lumbar)', code: 'SPINE-L', modality: 'X-Ray', price: 450, tat: 2 },
  { name: 'Knee X-Ray', code: 'KNEE', modality: 'X-Ray', price: 350, tat: 2 },
  { name: 'Hand X-Ray', code: 'HAND', modality: 'X-Ray', price: 300, tat: 2 },

  // Ultrasound
  { name: 'USG Abdomen', code: 'USG-ABD', modality: 'Ultrasound', price: 800, tat: 4 },
  { name: 'USG Pelvis', code: 'USG-PELV', modality: 'Ultrasound', price: 750, tat: 4 },
  { name: 'USG Obstetric', code: 'USG-OBS', modality: 'Ultrasound', price: 900, tat: 4 },
  { name: 'USG Breast', code: 'USG-BREAST', modality: 'Ultrasound', price: 850, tat: 4 },
  { name: 'USG Thyroid', code: 'USG-THYROID', modality: 'Ultrasound', price: 700, tat: 4 },

  // CT Scan
  { name: 'CT Brain (Plain)', code: 'CT-BRAIN', modality: 'CT', price: 2500, tat: 6 },
  { name: 'CT Brain (Contrast)', code: 'CT-BRAIN-C', modality: 'CT', price: 3500, tat: 6 },
  { name: 'CT Chest', code: 'CT-CHEST', modality: 'CT', price: 3000, tat: 6 },
  { name: 'CT Abdomen', code: 'CT-ABD', modality: 'CT', price: 3500, tat: 6 },
  { name: 'CT Spine', code: 'CT-SPINE', modality: 'CT', price: 3200, tat: 6 },

  // MRI
  { name: 'MRI Brain', code: 'MRI-BRAIN', modality: 'MRI', price: 5500, tat: 12 },
  { name: 'MRI Spine (Cervical)', code: 'MRI-SPINE-C', modality: 'MRI', price: 5800, tat: 12 },
  { name: 'MRI Spine (Lumbar)', code: 'MRI-SPINE-L', modality: 'MRI', price: 5800, tat: 12 },
  { name: 'MRI Knee', code: 'MRI-KNEE', modality: 'MRI', price: 5000, tat: 12 },
  { name: 'MRI Abdomen', code: 'MRI-ABD', modality: 'MRI', price: 6500, tat: 12 },

  // ECG / Echo
  { name: 'ECG (12 Lead)', code: 'ECG', modality: 'ECG', price: 200, tat: 1 },
  { name: '2D Echo', code: 'ECHO', modality: 'Echo', price: 1500, tat: 4 },
];

export const PROCEDURES = [
  // Consultation
  { name: 'General Physician Consultation', code: 'CONS-GP', category: 'Consultation', price: 500 },
  { name: 'Specialist Consultation', code: 'CONS-SP', category: 'Consultation', price: 800 },
  { name: 'Emergency Consultation', code: 'CONS-ER', category: 'Consultation', price: 1000 },

  // Minor Procedures
  { name: 'Wound Dressing (Simple)', code: 'DRESS-S', category: 'Minor Procedure', price: 300 },
  { name: 'Wound Dressing (Complex)', code: 'DRESS-C', category: 'Minor Procedure', price: 600 },
  { name: 'Suturing (Simple)', code: 'SUTURE-S', category: 'Minor Procedure', price: 800 },
  { name: 'Suturing (Complex)', code: 'SUTURE-C', category: 'Minor Procedure', price: 1500 },
  { name: 'IV Cannulation', code: 'IV-CANN', category: 'Minor Procedure', price: 200 },
  { name: 'Catheterization', code: 'CATH', category: 'Minor Procedure', price: 500 },
  { name: 'NG Tube Insertion', code: 'NGT', category: 'Minor Procedure', price: 400 },

  // OT Procedures
  { name: 'Appendectomy', code: 'OT-APPEN', category: 'Surgery', price: 35000 },
  { name: 'Cholecystectomy (Laparoscopic)', code: 'OT-CHOLE', category: 'Surgery', price: 55000 },
  { name: 'Hernia Repair', code: 'OT-HERNIA', category: 'Surgery', price: 40000 },
  { name: 'Caesarean Section', code: 'OT-CS', category: 'Surgery', price: 45000 },
  { name: 'Normal Delivery', code: 'OT-NVD', category: 'Obstetrics', price: 25000 },
  { name: 'Fracture Fixation', code: 'OT-FXFIX', category: 'Orthopedic', price: 60000 },
];

export const PACKAGES = [
  { name: 'Normal Delivery Package', code: 'PKG-NVD', items: ['OT-NVD', 'Room charges (2 days)', 'Nursing', 'Basic medicines'], price: 35000 },
  { name: 'C-Section Package', code: 'PKG-CS', items: ['OT-CS', 'Room charges (3 days)', 'Nursing', 'Basic medicines', 'Anaesthesia'], price: 60000 },
  { name: 'General Health Checkup', code: 'PKG-GHC', items: ['CONS-GP', 'CBC', 'FBS', 'LIPID', 'LFT', 'KFT', 'ECG', 'CXR-PA'], price: 3500 },
  { name: 'Diabetic Checkup', code: 'PKG-DM', items: ['CONS-SP', 'FBS', 'HBA1C', 'CREAT', 'URINE', 'LIPID'], price: 2500 },
];

export const WARDS = [
  { name: 'General Ward', type: 'general', floor: '1', totalBeds: 20, tariffPerDay: 800 },
  { name: 'Semi-Private Ward', type: 'semi-private', floor: '2', totalBeds: 10, tariffPerDay: 1500 },
  { name: 'Private Ward', type: 'private', floor: '2', totalBeds: 15, tariffPerDay: 2500 },
  { name: 'Deluxe Ward', type: 'deluxe', floor: '3', totalBeds: 8, tariffPerDay: 4000 },
  { name: 'ICU', type: 'icu', floor: '1', totalBeds: 10, tariffPerDay: 5000 },
  { name: 'NICU', type: 'nicu', floor: '1', totalBeds: 6, tariffPerDay: 6000 },
  { name: 'Emergency Ward', type: 'emergency', floor: 'G', totalBeds: 8, tariffPerDay: 1200 },
];

export const OT_THEATRES = [
  { name: 'OT 1 (Major)', type: 'major', floor: '2', equipment: ['Anaesthesia Machine', 'OT Table', 'Monitor', 'Cautery'] },
  { name: 'OT 2 (Major)', type: 'major', floor: '2', equipment: ['Anaesthesia Machine', 'OT Table', 'Monitor', 'Cautery'] },
  { name: 'OT 3 (Minor)', type: 'minor', floor: '2', equipment: ['OT Table', 'Monitor'] },
  { name: 'Labour Room', type: 'labour', floor: '2', equipment: ['Delivery Table', 'Warmer', 'Monitor'] },
];
