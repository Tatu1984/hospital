/**
 * Master list of services rendered by:
 *   - /services             (the index page, Services.tsx)
 *   - /services/:slug       (the detail page, ServiceDetail.tsx)
 *   - the Services dropdown in the website header
 *
 * Single source of truth — adding a service here automatically gives it a
 * detail page, a card on the index, and a menu entry. No code changes
 * needed elsewhere.
 *
 * `tag` is a categorisation that drives the colour pill on the index page;
 * the keys must match the TAG_STYLES map in pages/Services.tsx.
 *
 * `iconKey` is a string lookup into pages/Services.tsx's icon map so the
 * data file stays plain JSON (and can be moved to a CMS later) — Lucide
 * components don't serialise.
 */

export type ServiceTag = 'Core' | 'OPD' | 'IPD' | 'Diagnostics' | 'Support' | 'Wellness';

export interface ServiceDoctorRef {
  /** Doctor name as it appears in pages/Doctors.tsx — used to cross-link. */
  name: string;
}

export interface Service {
  slug: string;
  name: string;
  short: string;        // one-line summary used on cards + meta description
  tagline: string;      // hero strapline on the detail page
  intro: string[];      // 1-3 paragraphs intro
  highlights: string[]; // procedures / equipment we offer
  conditions: string[]; // common conditions treated
  faqs: { q: string; a: string }[];
  doctors: ServiceDoctorRef[];
  iconKey: string;
  tag: ServiceTag;
}

export const SERVICES: Service[] = [
  {
    slug: 'cardiology',
    name: 'Cardiology',
    iconKey: 'HeartPulse',
    tag: 'Core',
    short: 'Heart attack, angiography, angioplasty, pacemaker.',
    tagline: 'Heart care, exactly when it matters.',
    intro: [
      'Our cardiology team treats everything from preventive heart-health checks to emergency interventions for heart attacks. The cath lab is staffed round the clock — if you reach us within the golden hour, we can usually clear a blockage before damage becomes permanent.',
      'We are equally serious about long-term care. Patients leave us with a written plan, follow-up dates, and reminders that arrive on the patient portal — not a stack of papers and best wishes.',
    ],
    highlights: [
      '24×7 cath lab with senior interventional cardiologist on-call',
      'ECG, TMT, 2D Echo, Holter, ABPM, stress thallium',
      'Coronary angiography & angioplasty (PTCA)',
      'Permanent pacemaker, ICD, CRT-D implantation',
      'Cardiac rehabilitation programme post-MI',
    ],
    conditions: ['Heart attack (STEMI / NSTEMI)', 'Angina', 'Heart failure', 'Atrial fibrillation', 'Hypertension', 'Heart block', 'Valvular disease', 'Cardiomyopathy'],
    faqs: [
      { q: 'Do you accept emergency walk-ins?', a: 'Yes, 24×7. Walk into the emergency department or call 1066 — the cardiology team is paged automatically for chest-pain triage.' },
      { q: 'How quickly can I get an angiography?', a: 'Emergency cases go to the cath lab the same hour. Elective angiographies are typically scheduled within 48 hours.' },
      { q: 'Do you offer cashless angioplasty?', a: 'Yes, with 30+ insurance partners and TPAs. Pre-authorisation is usually approved within 4 hours.' },
    ],
    doctors: [{ name: 'Dr. Sarbari Mukherjee' }, { name: 'Dr. Lakshmi Ray' }],
  },
  {
    slug: 'neurology',
    name: 'Neurology & Stroke',
    iconKey: 'Brain',
    tag: 'Core',
    short: 'Stroke care, headache, seizure, neuro-rehabilitation.',
    tagline: 'Time is brain. We don\'t waste any.',
    intro: [
      'Stroke care is the most time-critical part of medicine. Our stroke ER protocol gets you from triage to thrombolysis in under 30 minutes — well inside the window that determines whether you walk out without disability.',
      'For non-emergencies — chronic migraines, epilepsy management, Parkinson\'s, post-stroke rehabilitation — we run dedicated weekly clinics so you see the same consultant each visit.',
    ],
    highlights: [
      'Stroke ER pathway with door-to-needle under 30 minutes',
      'On-site CT scan and MRI, available 24×7',
      'EEG, EMG, nerve conduction studies',
      'Headache, epilepsy, and movement-disorder OPDs',
      'Neuro-rehabilitation in partnership with the physiotherapy unit',
    ],
    conditions: ['Stroke', 'Transient ischaemic attack (TIA)', 'Epilepsy', 'Migraine', 'Parkinson\'s disease', 'Multiple sclerosis', 'Peripheral neuropathy', 'Dementia'],
    faqs: [
      { q: 'What should I do if I think someone is having a stroke?', a: 'Call 1066 immediately. While the ambulance is on the way, note the exact time symptoms started — this number determines whether thrombolysis is possible.' },
      { q: 'Do you do neurosurgery?', a: 'Diagnostic and emergency stabilisation, yes. Complex elective neurosurgery (e.g. brain tumour resection) is referred to a tertiary partner with shared records.' },
    ],
    doctors: [{ name: 'Dr. Mitra Ghosh' }],
  },
  {
    slug: 'paediatrics',
    name: 'Paediatrics & NICU',
    iconKey: 'Baby',
    tag: 'Core',
    short: 'Newborn care, vaccinations, NICU, child wellness.',
    tagline: 'From the first breath, looked after.',
    intro: [
      'We deliver about 80 babies a month and look after them from delivery through every routine check-up. The Level-IIIa NICU has ventilator beds for premature and critically ill newborns; the well-baby clinic handles vaccinations and growth tracking.',
      'Paediatrics OPD runs Mon-Sat. We schedule generously so children aren\'t rushed — most consultations run 20-25 minutes.',
    ],
    highlights: [
      'Level-IIIa NICU with ventilator support',
      'In-house paediatrician on-call 24×7',
      'Full vaccination schedule (national + IAP recommended)',
      'Well-baby growth and developmental checks',
      'Paediatric emergency with senior on duty round-the-clock',
    ],
    conditions: ['Premature birth', 'Neonatal jaundice', 'Respiratory infections', 'Diarrhoeal disease', 'Asthma', 'Allergies', 'Growth delay', 'Vaccination follow-up'],
    faqs: [
      { q: 'My baby is 32 weeks. Can your NICU handle that?', a: 'Yes. We have ventilator beds, CPAP, phototherapy and a paediatric intensivist 24×7. We have safely handled babies from 28 weeks onwards.' },
      { q: 'How do you handle child fevers — does every fever need a doctor?', a: 'No. We publish a fever guide for parents (when to wait at home vs when to come in) on the patient portal. Most fevers in healthy older children resolve at home with rest.' },
    ],
    doctors: [{ name: 'Dr. Priyanka Roy' }],
  },
  {
    slug: 'obstetrics-gynaecology',
    name: 'Obstetrics & Gynaecology',
    iconKey: 'Stethoscope',
    tag: 'Core',
    short: 'Antenatal, ultrasound, normal & C-section delivery, gynaec surgery.',
    tagline: 'Pregnancy and women\'s health, on your terms.',
    intro: [
      'Our antenatal package covers everything from the first ultrasound to delivery and postnatal recovery, on a fixed-price basis with no hidden charges. We strongly prefer normal delivery wherever clinically safe; the C-section rate sits at around 28% — well under the metro-hospital average.',
      'Beyond pregnancy, the gynaec OPD covers menstrual disorders, fertility consultation, menopause care, and surgical management of fibroids, ovarian cysts and other conditions.',
    ],
    highlights: [
      'Antenatal package (12 visits, 4 ultrasounds, lab panel)',
      'Painless delivery (epidural) on request',
      'Caesarean section with mother-baby bonding within 30 min',
      'Laparoscopic gynaec surgery — hysterectomy, fibroid removal',
      'Fertility consultation and basic IUI',
    ],
    conditions: ['Pregnancy & antenatal care', 'High-risk pregnancy', 'Caesarean delivery', 'Fibroids', 'PCOS', 'Endometriosis', 'Menopause', 'Cervical screening'],
    faqs: [
      { q: 'Can my husband / partner be in the labour room?', a: 'Yes, one support person is welcome throughout labour and at delivery (subject to operative-procedure exclusions during the surgical phase of a C-section).' },
      { q: 'How are bills calculated for delivery?', a: 'Our antenatal package quotes one all-inclusive amount for normal and one for C-section. The amount on discharge equals the quote — no unexpected line items.' },
    ],
    doctors: [{ name: 'Dr. Anuradha Sen' }],
  },
  {
    slug: 'orthopaedics',
    name: 'Orthopaedics & Joint Replacement',
    iconKey: 'Bone',
    tag: 'Core',
    short: 'Fracture care, joint replacement, arthroscopy, spine, sports injury.',
    tagline: 'Move better. We mean it literally.',
    intro: [
      'From a teenager\'s sports injury to a grandparent\'s knee replacement, the orthopaedics team operates the full range. Most joint-replacement patients walk with support within 48 hours and go home in 5-6 days.',
      'We use modern implants from established manufacturers (Stryker, J&J, Zimmer) and are transparent about which one you\'re getting and why. The implant brand and model is on the discharge sheet — not buried in jargon.',
    ],
    highlights: [
      'Total knee and hip replacement (with revision capability)',
      'Arthroscopic knee, shoulder and elbow surgery',
      'Spine surgery — laminectomy, discectomy, fusion',
      'Fracture management with internal fixation',
      'Sports-injury rehabilitation in partnership with physiotherapy',
    ],
    conditions: ['Osteoarthritis', 'Knee / hip joint failure', 'Lumbar disc prolapse', 'Sports injuries (ACL, meniscus, rotator cuff)', 'Fractures', 'Frozen shoulder', 'Sciatica'],
    faqs: [
      { q: 'How long is the recovery after total knee replacement?', a: 'Walking with support: 48 hours. Without support: 2-3 weeks. Full activity (golf, walking long distances): 6-8 weeks.' },
      { q: 'Do I get to choose the implant?', a: 'Yes. We discuss options, prices and trade-offs before consenting to surgery. The chosen implant model is recorded on your discharge summary.' },
    ],
    doctors: [{ name: 'Dr. Vikram Das' }],
  },
  {
    slug: 'general-surgery',
    name: 'General & Laparoscopic Surgery',
    iconKey: 'Scissors',
    tag: 'Core',
    short: 'Hernia, gallbladder, appendix — most done laparoscopically.',
    tagline: 'Smaller cuts. Faster home.',
    intro: [
      'About 80% of our general surgeries are done laparoscopically — three or four small incisions instead of one long one. The result: less pain, smaller scar, shorter hospital stay. Most patients go home the same day or next morning.',
      'Open surgery is still the right call for some cases (large hernias, complicated cancers, emergency exploratory laparotomy) and we do those too — the team has both skill sets.',
    ],
    highlights: [
      'Laparoscopic hernia repair (mesh placement)',
      'Laparoscopic cholecystectomy (gallbladder removal)',
      'Laparoscopic appendectomy',
      'Hydrocele and hemorrhoid surgery',
      'Open emergency surgery for trauma and acute abdomen',
    ],
    conditions: ['Hernia (inguinal, umbilical, incisional)', 'Gallstones', 'Appendicitis', 'Hemorrhoids / fissure', 'Hydrocele', 'Lipoma & skin lesions', 'Acute abdomen'],
    faqs: [
      { q: 'Is laparoscopic surgery as good as open surgery?', a: 'For the conditions above, yes — and recovery is significantly faster. There are specific cases (e.g. very large hernias, dense adhesions) where open surgery is preferred; we discuss this beforehand.' },
      { q: 'Will I need a follow-up visit?', a: 'One follow-up at 7-10 days for stitch / dressing check. A second at 4 weeks if anything is unusual. Both are included in the surgery package, no extra charge.' },
    ],
    doctors: [{ name: 'Dr. Abhik Pal' }],
  },
  {
    slug: 'ophthalmology',
    name: 'Ophthalmology',
    iconKey: 'Eye',
    tag: 'OPD',
    short: 'Cataract, LASIK, retinal care, glaucoma management.',
    tagline: 'Better vision starts with an honest eye check.',
    intro: [
      'Our eye OPD does honest, calm consultations — no upselling, no surprise findings. About 30% of first-time visitors leave with "your eyes are fine, see us in 2 years" rather than a procedure quote.',
      'For those who do need surgery, cataracts are a routine same-day procedure, LASIK is done in our day-care suite, and retinal cases (diabetic retinopathy, macular degeneration) are managed long-term with a designated consultant.',
    ],
    highlights: [
      'Cataract surgery (phacoemulsification + IOL implantation)',
      'LASIK and contoura vision (refractive correction)',
      'Glaucoma — diagnosis, IOP monitoring, laser, surgery',
      'Retinal disease — diabetic retinopathy, AMD',
      'Paediatric eye care including squint correction',
    ],
    conditions: ['Cataract', 'Refractive error (myopia, hypermetropia)', 'Glaucoma', 'Diabetic retinopathy', 'Macular degeneration', 'Dry eye', 'Squint', 'Eye trauma'],
    faqs: [
      { q: 'How long does cataract surgery take?', a: 'About 15 minutes in the OT, typically under topical anaesthesia (eye drops only — no injection). You go home the same day.' },
      { q: 'Am I a candidate for LASIK?', a: 'A 40-minute screening tells you for sure. We charge a nominal fee for the screening which is adjusted against the procedure if you go ahead.' },
    ],
    doctors: [{ name: 'Dr. Nandita Roy' }],
  },
  {
    slug: 'internal-medicine',
    name: 'Internal Medicine',
    iconKey: 'Stethoscope',
    tag: 'OPD',
    short: 'Diabetes, hypertension, fever clinic, geriatric care.',
    tagline: 'The doctor everyone in the family can see.',
    intro: [
      'Internal medicine is where most adult OPD visits start — fever, fatigue, blood-pressure check, diabetes review, "I just don\'t feel right". Our consultants take the time to listen first, order tests second, and prescribe only what\'s needed.',
      'We run a dedicated fever clinic during dengue and viral seasons (June-October) so a high-fever patient isn\'t sitting next to non-infectious cases.',
    ],
    highlights: [
      'Diabetes care with HbA1c monitoring and dietitian referral',
      'Hypertension management with ABPM',
      'Seasonal fever clinic (separate waiting area)',
      'Periodic health checks (basic, executive, senior)',
      'Geriatric medicine OPD',
    ],
    conditions: ['Diabetes', 'Hypertension', 'Thyroid disorders', 'Fever (viral, dengue, typhoid, malaria)', 'Dyslipidaemia', 'Anaemia', 'Acid peptic disease'],
    faqs: [
      { q: 'Should I do a yearly health check?', a: 'For most adults over 35, yes. Below 35, only if you have specific risk factors. We don\'t pressure-sell health-check packages.' },
      { q: 'Can I message my doctor between visits?', a: 'Once you have an account on the patient portal, yes — your doctor can reply to non-urgent queries within 1-2 working days.' },
    ],
    doctors: [{ name: 'Dr. Joydeep Sarkar' }],
  },
  {
    slug: 'critical-care-icu',
    name: 'Critical Care (ICU)',
    iconKey: 'Activity',
    tag: 'IPD',
    short: 'MICU, SICU, CCU — senior intensivist 24×7.',
    tagline: 'When it\'s the worst day, the right team is awake.',
    intro: [
      'Our 24-bed critical care unit has dedicated wings for medical, surgical and cardiac ICU patients. A senior intensivist is on duty 24×7 — not a junior with a phone-a-friend setup. Family briefings happen at fixed hours every day so relatives don\'t have to chase information.',
      'We follow international ventilator-care, sepsis and stroke protocols. Mortality and morbidity are reviewed monthly across the clinical team; lessons go straight into updated protocols.',
    ],
    highlights: [
      '24 ICU beds with full multi-parameter monitoring',
      'Ventilator support (invasive and non-invasive)',
      'Continuous Renal Replacement Therapy (CRRT)',
      'Senior intensivist on-floor 24×7',
      'Daily family briefings at 11am and 6pm',
    ],
    conditions: ['Sepsis', 'Respiratory failure', 'Cardiac arrest survivors', 'Severe pneumonia / COVID complications', 'Post-operative critical care', 'Stroke', 'Multi-organ failure'],
    faqs: [
      { q: 'Can I visit my relative in ICU?', a: 'Yes, twice a day in the visiting window. We keep the unit calm but not closed off — patients recover better when they see family.' },
      { q: 'Will I get a daily update?', a: 'Yes. The intensivist meets each family at 11am and 6pm. Outside those hours, the nurse-in-charge will give a brief update on a phone call from the bedside.' },
    ],
    doctors: [{ name: 'Dr. Imran Mondal' }],
  },
  {
    slug: 'emergency-trauma',
    name: 'Emergency & Trauma',
    iconKey: 'Bed',
    tag: 'IPD',
    short: 'Triage by senior physician, on-site CT, blood bank cross-match in 30 min.',
    tagline: 'Open. Always. No exception.',
    intro: [
      'The emergency department runs 24×7 with a senior emergency physician on duty at all hours — not a resident covering a phone. Triage happens within 5 minutes of arrival; resuscitation bays are staffed and ready.',
      'For trauma, every link in the chain — CT scan, blood bank, ortho / surgery / neuro consults — is in-house, so the time from arrival to surgery is minutes, not hours.',
    ],
    highlights: [
      'Triage in under 5 minutes by a senior physician',
      'Resuscitation bay with full code-blue setup',
      'CT scan available 24×7',
      'Blood bank cross-match in under 30 minutes',
      'On-call ortho, general surgery, neuro, and cardiac consultants',
    ],
    conditions: ['Road-traffic trauma', 'Heart attack / chest pain', 'Stroke', 'Fall injuries', 'Acute abdomen', 'Severe asthma', 'Poisoning', 'Snakebite'],
    faqs: [
      { q: 'Do I need an ambulance, or can I just drive?', a: 'Call 1066 if the patient is unstable (chest pain, breathing difficulty, head injury, suspected stroke). For non-life-threatening emergencies, driving in is fine.' },
      { q: 'Will I be billed for emergency care immediately?', a: 'No. Stabilisation comes first, billing is sorted afterwards. We accept all insurance cards and offer cashless wherever the policy permits.' },
    ],
    doctors: [{ name: 'Dr. Rohan Banerjee' }],
  },
  {
    slug: 'pathology',
    name: 'Pathology & Diagnostics',
    iconKey: 'Microscope',
    tag: 'Diagnostics',
    short: 'NABL-aligned lab. Most reports the same day.',
    tagline: 'Tests done right, reported on time.',
    intro: [
      'The lab is the quiet workhorse of any hospital. Ours is NABL-aligned, runs full biochemistry, haematology, microbiology and histopathology, and turns most routine reports around the same day.',
      'For tests that genuinely take time (cultures, special stains), the report appears on your patient portal the moment it\'s ready — no chasing the front desk.',
    ],
    highlights: [
      'NABL-aligned quality system',
      'Biochemistry, haematology, microbiology, histopathology',
      'Same-day reports for most routine tests',
      'Home sample collection across Kolkata',
      'Critical / panic values phoned to the doctor immediately',
    ],
    conditions: [],
    faqs: [
      { q: 'Do you offer home sample collection?', a: 'Yes, across Kolkata. Book via the patient portal or call our help desk. Reports are uploaded to your account; no need to come back.' },
      { q: 'How accurate is your lab?', a: 'We follow NABL standards including external quality assurance — every quarter we run blinded samples sent by an independent lab. Results are visible in our quarterly health report.' },
    ],
    doctors: [{ name: 'Dr. Tanya Saha' }],
  },
  {
    slug: 'radiology',
    name: 'Radiology & Imaging',
    iconKey: 'Activity',
    tag: 'Diagnostics',
    short: 'X-ray, ultrasound, CT, MRI, mammography. PACS-based reports.',
    tagline: 'Clear pictures. Plain-English reports.',
    intro: [
      'X-ray, ultrasound, CT, MRI and mammography are all on-site. A radiologist is available for emergency reads round the clock — no waiting until the morning shift to report a head injury.',
      'Reports are issued on a PACS system; you receive a digital copy on your patient portal and a printed copy if you ask for one. Films on physical CDs are still available on request — many older patients prefer them.',
    ],
    highlights: [
      'X-ray (digital), ultrasound (including portable for ICU)',
      'CT scan — multi-slice with contrast',
      'MRI 1.5 Tesla',
      'Mammography (screening + diagnostic)',
      'PACS-based digital report delivery',
    ],
    conditions: [],
    faqs: [
      { q: 'Will I get my report the same day?', a: 'X-rays and ultrasounds: yes. CT and MRI: typically same day, occasionally next morning if the radiologist needs more time for a complex case.' },
      { q: 'Can I get a second opinion on imaging?', a: 'Absolutely. We can share images on a download link to any other radiologist of your choice, free of charge.' },
    ],
    doctors: [],
  },
  {
    slug: 'blood-bank',
    name: 'Blood Bank',
    iconKey: 'Droplet',
    tag: 'Support',
    short: 'In-house blood bank — whole blood, components, cross-match on-site.',
    tagline: 'Blood is ready before the OT calls for it.',
    intro: [
      'Our in-house blood bank stocks whole blood, packed RBC, platelets, plasma and cryoprecipitate. Cross-match is done on-site, which means OT cases don\'t have to wait for couriered blood.',
      'We work with regular voluntary donors and accept walk-in donations from family members. Donor screening follows national blood-transfusion guidelines.',
    ],
    highlights: [
      'Whole blood + all major components in stock',
      'On-site cross-match (typically under 30 min)',
      'Voluntary blood-donation drives twice a year',
      'Component-separation unit',
      'Inventory tracked with expiry alerts (3-day, 7-day)',
    ],
    conditions: [],
    faqs: [
      { q: 'Can a family member donate for my surgery?', a: 'Yes. Replacement donations are accepted up to 3 days before scheduled surgery, subject to standard donor-eligibility criteria.' },
      { q: 'Do you accept rare blood-group requests from outside?', a: 'Yes — call our blood bank desk. We maintain a registry of rare-group voluntary donors and can typically arrange within 24 hours.' },
    ],
    doctors: [],
  },
  {
    slug: 'pharmacy',
    name: 'Pharmacy',
    iconKey: 'Pill',
    tag: 'Support',
    short: '24×7 in-house pharmacy. Barcode-linked dispensing. Home delivery.',
    tagline: 'The right medicine, at the right time, every time.',
    intro: [
      'The in-house pharmacy is open round the clock and uses RFID/barcode-linked dispensing — the prescription, the patient, and the medicine are all electronically matched before anything leaves the counter. That all-but-eliminates classic medication errors.',
      'For chronic-care patients, we offer home delivery within Kolkata. Refill reminders go to the patient portal so you don\'t run out unexpectedly.',
    ],
    highlights: [
      '24×7 in-house pharmacy',
      'RFID/barcode-linked dispensing for medication-error reduction',
      'Home delivery within Kolkata',
      'Automated refill reminders via the patient portal',
      'Generic-equivalent options offered transparently',
    ],
    conditions: [],
    faqs: [
      { q: 'Do you sell only branded medicine?', a: 'No. We offer the prescribed brand, but always tell you about a quality-checked generic alternative. The choice is yours.' },
      { q: 'Can I get medicines delivered home?', a: 'Yes, within Kolkata corporation limits. Order via the patient portal; delivery is typically same-day for orders before 5pm.' },
    ],
    doctors: [],
  },
  {
    slug: 'ambulance',
    name: 'Ambulance Service',
    iconKey: 'Ambulance',
    tag: 'Support',
    short: 'Three ambulances. Average response within Kolkata: 14 minutes.',
    tagline: 'On the road in three minutes from the call.',
    intro: [
      'We run three ambulances out of Park Street — one Basic Life Support and two Advanced Life Support. The crew dispatches within 3 minutes of a 1066 call, and average arrival time within Kolkata corporation limits is around 14 minutes.',
      'For inter-hospital transfers, the ALS ambulances are equipped for ventilated patients with a paramedic and a nurse on board.',
    ],
    highlights: [
      'Three ambulances (1 BLS + 2 ALS)',
      'Average response: 14 min within Kolkata',
      'Trained paramedic + nurse on every ALS run',
      'Equipped for ventilated patient transfer',
      'GPS-tracked dispatch (visible on the patient portal once the trip is booked)',
    ],
    conditions: [],
    faqs: [
      { q: 'How do I call an ambulance?', a: 'Dial 1066. The line goes straight to our control room — say the address, what happened, and stay on the line.' },
      { q: 'How much does it cost?', a: 'Within Kolkata corporation: ₹1,200 BLS / ₹2,500 ALS, fixed price. Outside Kolkata: per-km. The fee is on the discharge bill if the patient is admitted.' },
    ],
    doctors: [],
  },
  {
    slug: 'health-checkup',
    name: 'Health Checkup Packages',
    iconKey: 'Syringe',
    tag: 'Wellness',
    short: 'Basic, executive, women\'s health, senior. Bookable online.',
    tagline: 'A clear annual picture, in one morning.',
    intro: [
      'Health-checkup packages are the easiest way to get a yearly snapshot of how you\'re doing. We offer four levels — basic, executive, women\'s-health, and senior-citizen — each with a fixed price and clearly listed tests. No upselling on the day.',
      'Packages can be booked online and most are completed in a single 3-hour morning visit. Reports are uploaded to the patient portal with a written summary from a doctor.',
    ],
    highlights: [
      'Basic package: blood, ECG, X-ray, doctor consult (₹1,800)',
      'Executive package: above + 2D Echo, lipid, HbA1c, USG abdomen (₹4,500)',
      'Women\'s health: above + mammography, Pap smear, gynaec consult (₹6,200)',
      'Senior citizen: executive + bone density, geriatric assessment (₹5,800)',
      'Pre-employment package: bookable for corporates',
    ],
    conditions: [],
    faqs: [
      { q: 'Do I need to fast?', a: 'For most packages, yes — overnight 10-hour fast for blood-sugar and lipid panels. The booking confirmation lists exact requirements.' },
      { q: 'Will the report explain what each test means?', a: 'Yes. Every package report has a one-page plain-English summary written by a doctor — what\'s normal, what to watch, what (if anything) needs follow-up.' },
    ],
    doctors: [],
  },
];

export const SERVICE_BY_SLUG: Record<string, Service> = SERVICES.reduce(
  (acc, s) => ({ ...acc, [s.slug]: s }),
  {} as Record<string, Service>,
);
