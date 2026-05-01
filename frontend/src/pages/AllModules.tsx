// This file exports all remaining modules using the template pattern
import ModuleTemplate from './ModuleTemplate';
import { HeartPulse, Settings, ShieldCheck, Syringe, UserCog, Package, ClipboardList, Calculator, FileText, CreditCard, Video, Wind, Wrench, PersonStanding, Cross, Fingerprint, ImageIcon, Monitor, Wallet, Microscope, UserPlus, Receipt } from 'lucide-react';

export function HealthCheckup() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Health Checkup Packages" description="Preventive health checkup programs and wellness packages" icon={HeartPulse} stats={[{ label: 'Active Packages', value: 15 }, { label: 'Bookings Today', value: 23 }, { label: 'Completed', value: 145 }, { label: 'Revenue', value: '$45,600' }]} features={['Comprehensive health checkup packages', 'Corporate wellness programs', 'Package customization', 'Online booking integration', 'Report generation and delivery', 'Follow-up management']} />
    </div>
  );
}

export function SoftwareManagement() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Software Management" description="System configuration, master data, and settings" icon={Settings} stats={[{ label: 'Active Users', value: 156 }, { label: 'Departments', value: 24 }, { label: 'Services', value: 342 }, { label: 'Items', value: 1245 }]} features={['Master data management', 'Department and unit configuration', 'Service and tariff management', 'ICD-10 and procedure codes', 'Item master (drugs, consumables)', 'Multi-branch configuration', 'Tax and currency settings']} />
    </div>
  );
}

export function SystemControl() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="System Control" description="User management, roles, permissions, and access control" icon={ShieldCheck} stats={[{ label: 'Total Users', value: 156 }, { label: 'Active Sessions', value: 45 }, { label: 'Roles', value: 12 }, { label: 'Failed Logins', value: 3 }]} features={['Role-based access control (RBAC)', 'User and group management', 'Permission matrix', 'Audit logs and activity tracking', 'Session management', 'IP-based restrictions', 'Password policies', 'Two-factor authentication']} />
    </div>
  );
}

export function Phlebotomy() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Phlebotomy" description="Blood sample collection and tracking" icon={Syringe} stats={[{ label: 'Samples Today', value: 89 }, { label: 'Pending Collection', value: 12 }, { label: 'Collected', value: 77 }, { label: 'Rejected', value: 2 }]} features={['Sample collection scheduling', 'Barcode generation and scanning', 'Sample tracking workflow', 'Collection center management', 'Home collection routing', 'Sample rejection management', 'Phlebotomist assignment']} />
    </div>
  );
}

export function DoctorAssistant() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Doctor Assistant" description="Clinical assistant tools and documentation support" icon={UserCog} stats={[{ label: 'Doctors', value: 45 }, { label: 'Appointments', value: 123 }, { label: 'Templates', value: 67 }, { label: 'Protocols', value: 34 }]} features={['Clinical documentation assistance', 'Template management', 'Voice-to-text transcription', 'Clinical decision support', 'Protocol and guideline access', 'Patient history quick view', 'Order set management']} />
    </div>
  );
}

export function StoreManagement() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Store Management" description="Inventory, procurement, and stock control" icon={Package} stats={[{ label: 'Total Items', value: 2345 }, { label: 'Low Stock', value: 45 }, { label: 'Purchase Orders', value: 12 }, { label: 'Stock Value', value: '$456,000' }]} features={['Purchase requisition and approval', 'Purchase order management', 'Goods receipt note (GRN)', 'Stock management per store', 'Batch and expiry tracking', 'Stock transfers', 'Vendor management', 'Reorder level alerts']} />
    </div>
  );
}

export function OPDClinical() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="OPD Clinical Management" description="Clinical protocols, guidelines, and treatment plans" icon={ClipboardList} stats={[{ label: 'Active Protocols', value: 67 }, { label: 'Templates', value: 145 }, { label: 'Guidelines', value: 89 }, { label: 'Care Pathways', value: 34 }]} features={['Clinical protocol management', 'Treatment guidelines', 'Care pathway design', 'Clinical templates library', 'Evidence-based medicine resources', 'Quality improvement tracking']} />
    </div>
  );
}

export function Tally() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Tally Integration" description="Accounting system integration and financial sync" icon={Calculator} stats={[{ label: 'Synced Entries', value: 1234 }, { label: 'Pending', value: 23 }, { label: 'Today Revenue', value: '$12,450' }, { label: 'Expenses', value: '$3,200' }]} features={['Chart of accounts mapping', 'Real-time sync with Tally', 'Revenue recognition by department', 'Expense tracking', 'Automated journal entries', 'Financial report export', 'Reconciliation tools']} />
    </div>
  );
}

export function MRDManagement() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="MRD Management" description="Medical Records Department and document management" icon={FileText} stats={[{ label: 'Active Records', value: 12456 }, { label: 'Pending Filing', value: 45 }, { label: 'Requests Today', value: 23 }, { label: 'Digitized', value: '78%' }]} features={['Medical record archival', 'Document indexing and retrieval', 'Record request management', 'Consent and release forms', 'Record retention policies', 'Discharge summary compilation', 'Document scanning integration']} />
    </div>
  );
}

export function DoctorAccounting() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Doctor Accounting" description="Doctor revenue sharing and payouts" icon={CreditCard} stats={[{ label: 'Total Doctors', value: 45 }, { label: 'Pending Payouts', value: '$23,450' }, { label: 'Processed', value: '$145,000' }, { label: 'Consultations', value: 1234 }]} features={['Revenue sharing models', 'Consultation fee tracking', 'Procedure-based payouts', 'Commission calculation', 'Payout processing', 'Doctor-wise revenue reports', 'Contract management']} />
    </div>
  );
}

export function AssetManagement() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Asset Management" description="Hospital assets and equipment tracking" icon={Monitor} stats={[{ label: 'Total Assets', value: 1245 }, { label: 'Under Maintenance', value: 12 }, { label: 'Depreciation', value: '$45,600' }, { label: 'New This Month', value: 8 }]} features={['Asset registry and tagging', 'Asset categorization', 'Depreciation calculation', 'Location tracking', 'Maintenance scheduling', 'Asset transfer management', 'Asset disposal workflow']} />
    </div>
  );
}

export function VideoConversation() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Video/Phone Conversation" description="Teleconsultation and telemedicine platform" icon={Video} stats={[{ label: 'Consultations Today', value: 34 }, { label: 'Scheduled', value: 23 }, { label: 'Completed', value: 145 }, { label: 'Average Duration', value: '15 min' }]} features={['Video consultation scheduling', 'Secure video calling', 'Screen sharing', 'Digital prescription', 'E-Prescription integration', 'Payment gateway integration', 'Recording and playback', 'Chat and file sharing']} />
    </div>
  );
}

export function CSSD() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="CSSD" description="Central Sterile Supply Department management" icon={Wind} stats={[{ label: 'Sterilization Cycles', value: 45 }, { label: 'Items Today', value: 234 }, { label: 'Pending Validation', value: 12 }, { label: 'Efficiency', value: '94%' }]} features={['Sterilization cycle tracking', 'Instrument tracking', 'Pack assembly management', 'Validation and QC', 'Sterilization equipment logs', 'Biological indicator tracking', 'Expiry management', 'Department-wise issue tracking']} />
    </div>
  );
}

export function EquipmentMaintenance() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Equipment Maintenance" description="Biomedical equipment servicing and maintenance" icon={Wrench} stats={[{ label: 'Total Equipment', value: 456 }, { label: 'Due Maintenance', value: 23 }, { label: 'Under Service', value: 8 }, { label: 'Downtime', value: '2.3%' }]} features={['Preventive maintenance scheduling', 'AMC/CMC management', 'Complaint logging', 'Work order tracking', 'Spare parts inventory', 'Vendor management', 'Downtime analysis', 'Calibration tracking']} />
    </div>
  );
}

export function Physiotherapy() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Physiotherapy" description="Physiotherapy sessions and rehabilitation management" icon={PersonStanding} stats={[{ label: 'Active Patients', value: 67 }, { label: 'Sessions Today', value: 34 }, { label: 'Completed', value: 145 }, { label: 'Revenue', value: '$12,450' }]} features={['Session scheduling', 'Treatment protocols', 'Exercise plans', 'Progress tracking', 'Equipment management', 'Therapist assignment', 'Billing integration', 'Outcome measurement']} />
    </div>
  );
}

export function Mortuary() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Mortuary" description="Mortuary and deceased management" icon={Cross} stats={[{ label: 'Current Cases', value: 3 }, { label: 'This Month', value: 12 }, { label: 'Pending Release', value: 1 }, { label: 'Autopsies', value: 4 }]} features={['Deceased registration', 'Body storage tracking', 'Autopsy management', 'Death certificate generation', 'Release documentation', 'Refrigeration unit management', 'Forensic case handling', 'Family communication logs']} />
    </div>
  );
}

export function BiometricAttendance() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Biometric Attendance" description="Staff attendance and access control" icon={Fingerprint} stats={[{ label: 'Staff Count', value: 456 }, { label: 'Present Today', value: 423 }, { label: 'Late Arrivals', value: 12 }, { label: 'On Leave', value: 21 }]} features={['Biometric device integration', 'Real-time attendance tracking', 'Shift management', 'Late/early marking', 'Overtime calculation', 'Access control', 'Multiple device sync', 'Leave integration', 'Attendance reports']} />
    </div>
  );
}

export function DICOMPACS() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="DICOM/PACS" description="Medical imaging and PACS integration" icon={ImageIcon} stats={[{ label: 'Studies Today', value: 45 }, { label: 'Total Images', value: 12456 }, { label: 'Storage Used', value: '2.3 TB' }, { label: 'Modalities', value: 8 }]} features={['DICOM worklist management', 'Image viewing and manipulation', 'PACS integration', 'Study archival', 'CD/DVD burning', 'Teleradiology support', 'Image sharing', 'DICOM compliance']} />
    </div>
  );
}

export function MedicalDevice() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Medical Device Integration" description="Medical device connectivity and monitoring" icon={Monitor} stats={[{ label: 'Connected Devices', value: 89 }, { label: 'Online', value: 84 }, { label: 'Offline', value: 5 }, { label: 'Alerts', value: 12 }]} features={['Device connectivity', 'Real-time data capture', 'Vital signs monitoring', 'Lab instrument integration', 'Alert management', 'Data validation', 'Device status monitoring', 'Protocol support (HL7, ASTM)']} />
    </div>
  );
}

export function PayrollManagement() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Payroll Management" description="Staff payroll processing and management" icon={Wallet} stats={[{ label: 'Total Staff', value: 456 }, { label: 'Payroll This Month', value: '$345,000' }, { label: 'Processed', value: 423 }, { label: 'Pending', value: 33 }]} features={['Salary structure management', 'Attendance integration', 'Deduction management', 'Tax calculation', 'Payslip generation', 'Bank transfer integration', 'Statutory compliance', 'Loan and advance tracking']} />
    </div>
  );
}

export function Pathology() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Pathology" description="Pathology reports and specialized diagnostics" icon={Microscope} stats={[{ label: 'Cases Today', value: 34 }, { label: 'Histopathology', value: 12 }, { label: 'Cytology', value: 8 }, { label: 'Pending Reports', value: 14 }]} features={['Specimen tracking', 'Grossing and processing', 'Microscopic examination', 'Report templates', 'Image capture and annotation', 'Second opinion', 'IHC and special stains', 'Tumor board integration']} />
    </div>
  );
}

export function DoctorRegistration() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Doctor Registration" description="Doctor onboarding and credential management" icon={UserPlus} stats={[{ label: 'Total Doctors', value: 45 }, { label: 'Pending Verification', value: 3 }, { label: 'Specialties', value: 18 }, { label: 'Consultants', value: 32 }]} features={['Doctor profile management', 'Qualification and license tracking', 'Specialty and sub-specialty', 'Availability and schedule', 'Consultation fee setup', 'Document verification', 'Credential expiry alerts', 'Privilege management']} />
    </div>
  );
}

export function InpatientBilling() {
  return (
    <div className="bg-white min-h-full">
      <ModuleTemplate title="Inpatient Billing" description="IPD billing and discharge financial management" icon={Receipt} stats={[{ label: 'Active IPD Bills', value: 45 }, { label: 'Discharged Today', value: 8 }, { label: 'Revenue', value: '$45,600' }, { label: 'Pending', value: '$12,300' }]} features={['Room and bed charges', 'Package billing', 'Nursing charges', 'Consumables billing', 'Procedure charges', 'Advance and deposits', 'Insurance claims', 'Discharge summary with billing']} />
    </div>
  );
}
