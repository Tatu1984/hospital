// Canonical ambulance types + equipment catalogue.
//
// The hospital operates a mixed fleet: not just basic stretcher vans, but
// kitted-out Critical Care, Cardiac, Neonatal, and Bariatric units. Each
// type is identified by a short code stored on AmbulanceVehicle.type; the
// human-readable label lives here so the FE selector and the backend
// audit log read the same names.
//
// The `defaultEquipment` list per type is what the vehicle "should" carry
// out of the box. The Add-Vehicle form pre-fills this list; the operator
// can tick boxes off (e.g. older vehicle without an ECG monitor) or add
// extras. Equipment is matched at dispatch time against trip requirements
// so a stroke alert gets a unit with an actual monitor, not a stretcher
// van.

export const AMBULANCE_EQUIPMENT = {
  // Airway & oxygen
  OXYGEN_CYLINDER: 'Oxygen cylinder',
  BAG_VALVE_MASK: 'Bag-valve-mask (BVM)',
  SUCTION_UNIT: 'Portable suction unit',
  AIRWAY_KIT: 'Airway adjuncts kit',
  // Cardiac & monitoring
  ECG_MONITOR: '12-lead ECG monitor',
  DEFIBRILLATOR_AED: 'AED (semi-automatic)',
  DEFIBRILLATOR_MANUAL: 'Manual defibrillator',
  PACER: 'External pacemaker',
  PULSE_OXIMETER: 'Pulse oximeter',
  NIBP_MONITOR: 'NIBP / multi-para monitor',
  // Ventilation
  VENTILATOR_TRANSPORT: 'Transport ventilator',
  CPAP_BIPAP: 'CPAP / BiPAP unit',
  // Critical care extras
  INFUSION_PUMP: 'Syringe / infusion pump',
  ECMO_UNIT: 'Portable ECMO',
  // Stretchers / movement
  STRETCHER: 'Main stretcher',
  SCOOP_STRETCHER: 'Scoop stretcher',
  SPINAL_BOARD: 'Spinal board + collars',
  BARIATRIC_STRETCHER: 'Bariatric (>200 kg) stretcher',
  // Neonatal
  INCUBATOR: 'Transport incubator',
  NEONATAL_VENTILATOR: 'Neonatal ventilator',
  PHOTOTHERAPY: 'Phototherapy unit',
  RADIANT_WARMER: 'Radiant warmer',
  // Drugs / consumables
  CRASH_KIT: 'Cardiac arrest drug box',
  IV_KIT: 'IV access kit',
  TRAUMA_KIT: 'Trauma / bleeding control kit',
  OBSTETRIC_KIT: 'Obstetric / delivery kit',
  // Misc
  AC: 'Air-conditioning',
  GPS: 'GPS tracker',
  SIREN_PA: 'Siren + public-address',
} as const;

export type EquipmentCode = keyof typeof AMBULANCE_EQUIPMENT;

export interface AmbulanceTypeDef {
  code: string;
  label: string;
  // Short tagline shown in the type-picker so dispatchers know when to
  // reach for this rather than another.
  description: string;
  // Equipment shipped by default for this type. The operator can
  // unselect items (older fleet) or add extras during vehicle setup.
  defaultEquipment: EquipmentCode[];
}

export const AMBULANCE_TYPES: AmbulanceTypeDef[] = [
  {
    code: 'BLS',
    label: 'Basic Life Support',
    description: 'Stretcher transport with O₂, BVM, AED. Manned by EMT-B.',
    defaultEquipment: [
      'STRETCHER',
      'OXYGEN_CYLINDER',
      'BAG_VALVE_MASK',
      'SUCTION_UNIT',
      'AIRWAY_KIT',
      'PULSE_OXIMETER',
      'DEFIBRILLATOR_AED',
      'IV_KIT',
      'TRAUMA_KIT',
      'SPINAL_BOARD',
      'GPS',
      'SIREN_PA',
    ],
  },
  {
    code: 'ALS',
    label: 'Advanced Life Support',
    description: 'Adds full monitor, manual defibrillator, intubation, IV drugs. Manned by EMT-P / nurse.',
    defaultEquipment: [
      'STRETCHER',
      'OXYGEN_CYLINDER',
      'BAG_VALVE_MASK',
      'SUCTION_UNIT',
      'AIRWAY_KIT',
      'ECG_MONITOR',
      'DEFIBRILLATOR_MANUAL',
      'PULSE_OXIMETER',
      'NIBP_MONITOR',
      'INFUSION_PUMP',
      'CRASH_KIT',
      'IV_KIT',
      'TRAUMA_KIT',
      'SPINAL_BOARD',
      'GPS',
      'SIREN_PA',
      'AC',
    ],
  },
  {
    code: 'ICU',
    label: 'ICU / Critical Care',
    description: 'Mobile ICU: transport ventilator, multipara monitor, multiple pumps. Manned by intensivist + ICU nurse.',
    defaultEquipment: [
      'STRETCHER',
      'OXYGEN_CYLINDER',
      'BAG_VALVE_MASK',
      'SUCTION_UNIT',
      'AIRWAY_KIT',
      'ECG_MONITOR',
      'DEFIBRILLATOR_MANUAL',
      'PACER',
      'NIBP_MONITOR',
      'VENTILATOR_TRANSPORT',
      'CPAP_BIPAP',
      'INFUSION_PUMP',
      'CRASH_KIT',
      'IV_KIT',
      'TRAUMA_KIT',
      'GPS',
      'SIREN_PA',
      'AC',
    ],
  },
  {
    code: 'CARDIAC',
    label: 'Cardiac (CCU)',
    description: '12-lead ECG, manual defibrillator, pacing, IABP-compatible. For STEMI / arrhythmia transfers.',
    defaultEquipment: [
      'STRETCHER',
      'OXYGEN_CYLINDER',
      'BAG_VALVE_MASK',
      'ECG_MONITOR',
      'DEFIBRILLATOR_MANUAL',
      'PACER',
      'PULSE_OXIMETER',
      'NIBP_MONITOR',
      'INFUSION_PUMP',
      'CRASH_KIT',
      'IV_KIT',
      'GPS',
      'SIREN_PA',
      'AC',
    ],
  },
  {
    code: 'NEONATAL',
    label: 'Neonatal',
    description: 'Transport incubator, neonatal ventilator, radiant warmer, phototherapy. Pre-term / sick newborn transfer.',
    defaultEquipment: [
      'INCUBATOR',
      'NEONATAL_VENTILATOR',
      'RADIANT_WARMER',
      'PHOTOTHERAPY',
      'OXYGEN_CYLINDER',
      'SUCTION_UNIT',
      'PULSE_OXIMETER',
      'NIBP_MONITOR',
      'INFUSION_PUMP',
      'GPS',
      'AC',
    ],
  },
  {
    code: 'BARIATRIC',
    label: 'Bariatric',
    description: 'Wide-frame ALS unit with reinforced stretcher and hydraulic lift for >200 kg patients.',
    defaultEquipment: [
      'BARIATRIC_STRETCHER',
      'OXYGEN_CYLINDER',
      'BAG_VALVE_MASK',
      'ECG_MONITOR',
      'PULSE_OXIMETER',
      'NIBP_MONITOR',
      'INFUSION_PUMP',
      'IV_KIT',
      'GPS',
      'SIREN_PA',
      'AC',
    ],
  },
  {
    code: 'OBSTETRIC',
    label: 'Obstetric',
    description: 'Delivery kit, neonatal resuscitator, fetal monitor. Imminent-delivery transfers.',
    defaultEquipment: [
      'STRETCHER',
      'OXYGEN_CYLINDER',
      'BAG_VALVE_MASK',
      'SUCTION_UNIT',
      'PULSE_OXIMETER',
      'NIBP_MONITOR',
      'OBSTETRIC_KIT',
      'RADIANT_WARMER',
      'IV_KIT',
      'GPS',
      'SIREN_PA',
      'AC',
    ],
  },
  {
    code: 'PATIENT_TRANSPORT',
    label: 'Patient Transport (non-emergency)',
    description: 'Routine discharge / inter-facility transfer for stable patients. No advanced equipment.',
    defaultEquipment: ['STRETCHER', 'OXYGEN_CYLINDER', 'GPS'],
  },
  {
    code: 'MORTUARY',
    label: 'Mortuary van',
    description: 'Deceased transport. Refrigerated body compartment.',
    defaultEquipment: ['GPS'],
  },
];

export const AMBULANCE_TYPE_CODES = AMBULANCE_TYPES.map((t) => t.code);

export function isAmbulanceTypeCode(v: unknown): v is string {
  return typeof v === 'string' && AMBULANCE_TYPE_CODES.includes(v);
}

export function getAmbulanceType(code: string): AmbulanceTypeDef | undefined {
  return AMBULANCE_TYPES.find((t) => t.code === code);
}
