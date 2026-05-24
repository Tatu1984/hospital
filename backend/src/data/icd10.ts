// Curated ICD-10 lookup. Covers the diagnoses we see most often in
// Indian multi-speciality OPD/IPD — about 200 entries against the
// full WHO list of ~14k. For an actual deployment we'd ship the
// complete WHO ICD-10 CSV (public domain) and index it. This curated
// subset gets us started without bloating the bundle.

export interface IcdEntry { code: string; title: string; chapter: string }

export const ICD10: IcdEntry[] = [
  // I. Certain infectious / parasitic
  { code: 'A09',   title: 'Diarrhoea and gastroenteritis of presumed infectious origin', chapter: 'Infectious' },
  { code: 'A15.0', title: 'Tuberculosis of lung', chapter: 'Infectious' },
  { code: 'A41.9', title: 'Sepsis, unspecified', chapter: 'Infectious' },
  { code: 'A90',   title: 'Dengue fever (classical dengue)', chapter: 'Infectious' },
  { code: 'A91',   title: 'Dengue haemorrhagic fever', chapter: 'Infectious' },
  { code: 'B50.9', title: 'Plasmodium falciparum malaria, unspecified', chapter: 'Infectious' },
  { code: 'B19.9', title: 'Viral hepatitis, unspecified', chapter: 'Infectious' },
  { code: 'B24',   title: 'HIV disease, unspecified', chapter: 'Infectious' },
  { code: 'B34.9', title: 'Viral infection, unspecified', chapter: 'Infectious' },

  // II. Neoplasms
  { code: 'C50.9', title: 'Malignant neoplasm of breast, unspecified', chapter: 'Neoplasms' },
  { code: 'C34.9', title: 'Malignant neoplasm of bronchus or lung, unspecified', chapter: 'Neoplasms' },
  { code: 'C18.9', title: 'Malignant neoplasm of colon, unspecified', chapter: 'Neoplasms' },
  { code: 'C61',   title: 'Malignant neoplasm of prostate', chapter: 'Neoplasms' },
  { code: 'C73',   title: 'Malignant neoplasm of thyroid gland', chapter: 'Neoplasms' },
  { code: 'D24',   title: 'Benign neoplasm of breast', chapter: 'Neoplasms' },
  { code: 'D25.9', title: 'Leiomyoma of uterus, unspecified', chapter: 'Neoplasms' },

  // III. Blood / immune
  { code: 'D50.9', title: 'Iron deficiency anaemia, unspecified', chapter: 'Blood' },
  { code: 'D64.9', title: 'Anaemia, unspecified', chapter: 'Blood' },
  { code: 'D69.6', title: 'Thrombocytopenia, unspecified', chapter: 'Blood' },

  // IV. Endocrine / metabolic
  { code: 'E10.9', title: 'Type 1 diabetes mellitus without complications', chapter: 'Endocrine' },
  { code: 'E11.9', title: 'Type 2 diabetes mellitus without complications', chapter: 'Endocrine' },
  { code: 'E11.2', title: 'Type 2 diabetes mellitus with renal complications', chapter: 'Endocrine' },
  { code: 'E11.4', title: 'Type 2 diabetes mellitus with neurological complications', chapter: 'Endocrine' },
  { code: 'E14.9', title: 'Unspecified diabetes mellitus without complications', chapter: 'Endocrine' },
  { code: 'E03.9', title: 'Hypothyroidism, unspecified', chapter: 'Endocrine' },
  { code: 'E05.9', title: 'Thyrotoxicosis (hyperthyroidism), unspecified', chapter: 'Endocrine' },
  { code: 'E66.9', title: 'Obesity, unspecified', chapter: 'Endocrine' },
  { code: 'E78.5', title: 'Hyperlipidaemia, unspecified', chapter: 'Endocrine' },
  { code: 'E86',   title: 'Dehydration / volume depletion', chapter: 'Endocrine' },
  { code: 'E87.6', title: 'Hypokalaemia', chapter: 'Endocrine' },

  // V. Mental / behavioural
  { code: 'F32.9', title: 'Depressive episode, unspecified', chapter: 'Mental' },
  { code: 'F41.1', title: 'Generalised anxiety disorder', chapter: 'Mental' },
  { code: 'F20.9', title: 'Schizophrenia, unspecified', chapter: 'Mental' },
  { code: 'F10.2', title: 'Mental and behavioural disorders due to alcohol use, dependence syndrome', chapter: 'Mental' },

  // VI. Nervous system
  { code: 'G40.9', title: 'Epilepsy, unspecified', chapter: 'Nervous' },
  { code: 'G43.9', title: 'Migraine, unspecified', chapter: 'Nervous' },
  { code: 'G45.9', title: 'Transient cerebral ischaemic attack, unspecified', chapter: 'Nervous' },
  { code: 'G20',   title: "Parkinson's disease", chapter: 'Nervous' },
  { code: 'G35',   title: 'Multiple sclerosis', chapter: 'Nervous' },

  // VII. Eye
  { code: 'H25.9', title: 'Senile cataract, unspecified', chapter: 'Eye' },
  { code: 'H40.9', title: 'Glaucoma, unspecified', chapter: 'Eye' },
  { code: 'H52.0', title: 'Hypermetropia', chapter: 'Eye' },
  { code: 'H52.1', title: 'Myopia', chapter: 'Eye' },

  // VIII. Ear
  { code: 'H66.9', title: 'Otitis media, unspecified', chapter: 'Ear' },

  // IX. Circulatory
  { code: 'I10',   title: 'Essential (primary) hypertension', chapter: 'Circulatory' },
  { code: 'I21.9', title: 'Acute myocardial infarction, unspecified', chapter: 'Circulatory' },
  { code: 'I25.1', title: 'Atherosclerotic heart disease', chapter: 'Circulatory' },
  { code: 'I25.9', title: 'Chronic ischaemic heart disease, unspecified', chapter: 'Circulatory' },
  { code: 'I48',   title: 'Atrial fibrillation and flutter', chapter: 'Circulatory' },
  { code: 'I50.0', title: 'Congestive heart failure', chapter: 'Circulatory' },
  { code: 'I63.9', title: 'Cerebral infarction (stroke), unspecified', chapter: 'Circulatory' },
  { code: 'I64',   title: 'Stroke, not specified as haemorrhage or infarction', chapter: 'Circulatory' },
  { code: 'I83.9', title: 'Varicose veins of lower extremities without ulcer or inflammation', chapter: 'Circulatory' },
  { code: 'I84.0', title: 'Internal haemorrhoids', chapter: 'Circulatory' },

  // X. Respiratory
  { code: 'J00',   title: 'Acute nasopharyngitis (common cold)', chapter: 'Respiratory' },
  { code: 'J02.9', title: 'Acute pharyngitis, unspecified', chapter: 'Respiratory' },
  { code: 'J06.9', title: 'Acute upper respiratory infection, unspecified', chapter: 'Respiratory' },
  { code: 'J18.9', title: 'Pneumonia, unspecified', chapter: 'Respiratory' },
  { code: 'J20.9', title: 'Acute bronchitis, unspecified', chapter: 'Respiratory' },
  { code: 'J44.9', title: 'Chronic obstructive pulmonary disease (COPD), unspecified', chapter: 'Respiratory' },
  { code: 'J45.9', title: 'Asthma, unspecified', chapter: 'Respiratory' },
  { code: 'J96.0', title: 'Acute respiratory failure', chapter: 'Respiratory' },

  // XI. Digestive
  { code: 'K21.9', title: 'Gastro-oesophageal reflux disease without oesophagitis', chapter: 'Digestive' },
  { code: 'K27.9', title: 'Peptic ulcer, site unspecified', chapter: 'Digestive' },
  { code: 'K29.7', title: 'Gastritis, unspecified', chapter: 'Digestive' },
  { code: 'K35.8', title: 'Acute appendicitis, other and unspecified', chapter: 'Digestive' },
  { code: 'K40.9', title: 'Unilateral or unspecified inguinal hernia', chapter: 'Digestive' },
  { code: 'K42.9', title: 'Umbilical hernia without obstruction or gangrene', chapter: 'Digestive' },
  { code: 'K52.9', title: 'Non-infective gastroenteritis and colitis, unspecified', chapter: 'Digestive' },
  { code: 'K59.0', title: 'Constipation', chapter: 'Digestive' },
  { code: 'K70.3', title: 'Alcoholic cirrhosis of liver', chapter: 'Digestive' },
  { code: 'K76.0', title: 'Fatty (change of) liver, not elsewhere classified', chapter: 'Digestive' },
  { code: 'K80.2', title: 'Calculus of gallbladder (cholelithiasis)', chapter: 'Digestive' },

  // XII. Skin
  { code: 'L02.9', title: 'Cutaneous abscess, furuncle and carbuncle, unspecified', chapter: 'Skin' },
  { code: 'L03.9', title: 'Cellulitis, unspecified', chapter: 'Skin' },
  { code: 'L30.9', title: 'Dermatitis, unspecified', chapter: 'Skin' },
  { code: 'L40.9', title: 'Psoriasis, unspecified', chapter: 'Skin' },

  // XIII. Musculoskeletal
  { code: 'M17.9', title: 'Osteoarthritis of knee, unspecified', chapter: 'Musculoskeletal' },
  { code: 'M19.9', title: 'Osteoarthritis, unspecified', chapter: 'Musculoskeletal' },
  { code: 'M25.5', title: 'Pain in joint', chapter: 'Musculoskeletal' },
  { code: 'M54.5', title: 'Low back pain', chapter: 'Musculoskeletal' },
  { code: 'M79.7', title: 'Fibromyalgia', chapter: 'Musculoskeletal' },
  { code: 'M81.9', title: 'Osteoporosis, unspecified', chapter: 'Musculoskeletal' },

  // XIV. Genitourinary
  { code: 'N18.6', title: 'End stage renal disease', chapter: 'Genitourinary' },
  { code: 'N18.9', title: 'Chronic kidney disease, unspecified', chapter: 'Genitourinary' },
  { code: 'N17.9', title: 'Acute kidney failure, unspecified', chapter: 'Genitourinary' },
  { code: 'N20.0', title: 'Calculus of kidney', chapter: 'Genitourinary' },
  { code: 'N39.0', title: 'Urinary tract infection, site not specified', chapter: 'Genitourinary' },
  { code: 'N40',   title: 'Benign prostatic hyperplasia', chapter: 'Genitourinary' },
  { code: 'N92.0', title: 'Excessive and frequent menstruation', chapter: 'Genitourinary' },
  { code: 'N95.1', title: 'Menopausal and female climacteric states', chapter: 'Genitourinary' },

  // XV. Pregnancy, childbirth, puerperium
  { code: 'O80',   title: 'Single spontaneous delivery', chapter: 'Pregnancy' },
  { code: 'O82',   title: 'Single delivery by caesarean section', chapter: 'Pregnancy' },
  { code: 'O14.9', title: 'Pre-eclampsia, unspecified', chapter: 'Pregnancy' },
  { code: 'O24.4', title: 'Gestational diabetes mellitus', chapter: 'Pregnancy' },
  { code: 'O72.1', title: 'Postpartum haemorrhage', chapter: 'Pregnancy' },
  { code: 'O03.9', title: 'Complete or unspecified spontaneous abortion without complication', chapter: 'Pregnancy' },

  // XVI. Perinatal
  { code: 'P07.3', title: 'Other preterm infants', chapter: 'Perinatal' },
  { code: 'P59.9', title: 'Neonatal jaundice, unspecified', chapter: 'Perinatal' },
  { code: 'P22.0', title: 'Respiratory distress syndrome of newborn', chapter: 'Perinatal' },

  // XVII. Congenital
  { code: 'Q21.0', title: 'Ventricular septal defect', chapter: 'Congenital' },
  { code: 'Q21.1', title: 'Atrial septal defect', chapter: 'Congenital' },

  // XVIII. Symptoms / signs / abnormal findings (often used as provisional)
  { code: 'R05',   title: 'Cough', chapter: 'Symptoms' },
  { code: 'R07.4', title: 'Chest pain, unspecified', chapter: 'Symptoms' },
  { code: 'R10.4', title: 'Other and unspecified abdominal pain', chapter: 'Symptoms' },
  { code: 'R11',   title: 'Nausea and vomiting', chapter: 'Symptoms' },
  { code: 'R19.7', title: 'Diarrhoea, unspecified', chapter: 'Symptoms' },
  { code: 'R42',   title: 'Dizziness and giddiness', chapter: 'Symptoms' },
  { code: 'R51',   title: 'Headache', chapter: 'Symptoms' },
  { code: 'R52.9', title: 'Pain, unspecified', chapter: 'Symptoms' },
  { code: 'R55',   title: 'Syncope and collapse', chapter: 'Symptoms' },
  { code: 'R56.9', title: 'Convulsions, unspecified', chapter: 'Symptoms' },
  { code: 'R63.0', title: 'Anorexia', chapter: 'Symptoms' },
  { code: 'R73.9', title: 'Hyperglycaemia, unspecified', chapter: 'Symptoms' },

  // XIX. Injury, poisoning
  { code: 'S06.0', title: 'Concussion', chapter: 'Injury' },
  { code: 'S52.5', title: 'Fracture of lower end of radius', chapter: 'Injury' },
  { code: 'S72.0', title: 'Fracture of neck of femur', chapter: 'Injury' },
  { code: 'S82.2', title: 'Fracture of shaft of tibia', chapter: 'Injury' },
  { code: 'T14.9', title: 'Injury, unspecified', chapter: 'Injury' },
  { code: 'T39.1', title: 'Poisoning by 4-aminophenol derivatives (e.g. paracetamol)', chapter: 'Injury' },
  { code: 'T78.2', title: 'Anaphylactic shock, unspecified', chapter: 'Injury' },

  // XX. External causes
  { code: 'V89.2', title: 'Person injured in unspecified motor-vehicle accident, traffic', chapter: 'External' },

  // XXI. Factors influencing health status
  { code: 'Z00.0', title: 'General adult medical examination', chapter: 'Z-codes' },
  { code: 'Z01.0', title: 'Examination of eyes and vision', chapter: 'Z-codes' },
  { code: 'Z11.4', title: 'Special screening examination for human immunodeficiency virus [HIV]', chapter: 'Z-codes' },
  { code: 'Z34.9', title: 'Supervision of normal pregnancy, unspecified', chapter: 'Z-codes' },
  { code: 'Z51.1', title: 'Antineoplastic chemotherapy session', chapter: 'Z-codes' },
  { code: 'Z51.5', title: 'Palliative care', chapter: 'Z-codes' },
  { code: 'Z99.2', title: 'Dependence on renal dialysis', chapter: 'Z-codes' },
];

// Lowercased searchable index — built once at module load.
const SEARCH_INDEX = ICD10.map((e) => ({
  ...e,
  _q: `${e.code} ${e.title}`.toLowerCase(),
}));

export function searchIcd10(q: string, limit = 20): IcdEntry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  // Exact-prefix on code wins, then title contains, then any.
  const codeStart   = SEARCH_INDEX.filter((e) => e.code.toLowerCase().startsWith(needle));
  const titleStart  = SEARCH_INDEX.filter((e) => e.title.toLowerCase().startsWith(needle) && !codeStart.includes(e));
  const anyMatch    = SEARCH_INDEX.filter((e) => e._q.includes(needle) && !codeStart.includes(e) && !titleStart.includes(e));
  return [...codeStart, ...titleStart, ...anyMatch]
    .slice(0, limit)
    .map(({ _q, ...rest }) => rest);
}

export function getIcd10ByCode(code: string): IcdEntry | undefined {
  return ICD10.find((e) => e.code.toLowerCase() === code.toLowerCase());
}
