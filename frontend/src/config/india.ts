// India-specific reference lists used by patient registration / TPA /
// reports. Kept as plain string arrays so they can be dropped straight
// into <Select> options without further normalisation.

// All 28 states + 8 union territories. UTs are tagged so the UI can
// group them visually if desired; the value remains the bare name.
export const INDIA_STATES: Array<{ name: string; isUT?: boolean }> = [
  { name: 'Andhra Pradesh' },
  { name: 'Arunachal Pradesh' },
  { name: 'Assam' },
  { name: 'Bihar' },
  { name: 'Chhattisgarh' },
  { name: 'Goa' },
  { name: 'Gujarat' },
  { name: 'Haryana' },
  { name: 'Himachal Pradesh' },
  { name: 'Jharkhand' },
  { name: 'Karnataka' },
  { name: 'Kerala' },
  { name: 'Madhya Pradesh' },
  { name: 'Maharashtra' },
  { name: 'Manipur' },
  { name: 'Meghalaya' },
  { name: 'Mizoram' },
  { name: 'Nagaland' },
  { name: 'Odisha' },
  { name: 'Punjab' },
  { name: 'Rajasthan' },
  { name: 'Sikkim' },
  { name: 'Tamil Nadu' },
  { name: 'Telangana' },
  { name: 'Tripura' },
  { name: 'Uttar Pradesh' },
  { name: 'Uttarakhand' },
  { name: 'West Bengal' },
  // Union Territories
  { name: 'Andaman & Nicobar Islands', isUT: true },
  { name: 'Chandigarh', isUT: true },
  { name: 'Dadra & Nagar Haveli and Daman & Diu', isUT: true },
  { name: 'Delhi', isUT: true },
  { name: 'Jammu & Kashmir', isUT: true },
  { name: 'Ladakh', isUT: true },
  { name: 'Lakshadweep', isUT: true },
  { name: 'Puducherry', isUT: true },
];

// State → major cities for that state. Used to drive the City dropdown
// once a state has been chosen. Coverage is "major hospital catchments"
// — enough for typeahead matching of 95%+ of patients. If the patient
// is from a smaller town, they can type it freely (City is a combobox,
// not a strict Select).
export const INDIA_CITIES_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Bihar Sharif'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak', 'Sonipat'],
  'Himachal Pradesh': ['Shimla', 'Solan', 'Mandi', 'Dharamshala', 'Kullu', 'Hamirpur'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli-Dharwad', 'Mangaluru', 'Belagavi', 'Davanagere', 'Ballari', 'Tumakuru', 'Shivamogga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad (Prayagraj)', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur'],
  // Union Territories
  'Andaman & Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Silvassa', 'Daman', 'Diu'],
  'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Lajpat Nagar', 'Connaught Place'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

// Accepted government-issued ID types in India. Aadhaar leads because
// it's the de facto standard for hospital registration; PAN second for
// adults; Voter ID third (most-issued non-Aadhaar form).
export const INDIA_ID_PROOF_TYPES: Array<{ value: string; label: string }> = [
  { value: 'aadhaar',         label: 'Aadhaar card' },
  { value: 'pan',             label: 'PAN card' },
  { value: 'voter_id',        label: 'Voter ID (EPIC)' },
  { value: 'driving_license', label: "Driver's license" },
  { value: 'passport',        label: 'Passport' },
  { value: 'ration_card',     label: 'Ration card' },
  { value: 'cghs',            label: 'CGHS / ECHS card' },
  { value: 'employee_id',     label: 'Employee / Govt ID' },
  { value: 'student_id',      label: 'Student ID' },
  { value: 'other',           label: 'Other' },
];

// Common Indian health-insurance providers (private + PSU + government
// schemes). Treated as a suggestion list — patients with a regional or
// niche insurer can pick 'Other' and free-type the name.
export const INDIA_INSURANCE_PROVIDERS: string[] = [
  // PSU / govt-owned
  'New India Assurance',
  'National Insurance',
  'Oriental Insurance',
  'United India Insurance',
  // Private standalone health
  'Star Health & Allied Insurance',
  'Care Health Insurance (Religare)',
  'Niva Bupa (Max Bupa)',
  'ManipalCigna Health Insurance',
  'Aditya Birla Health Insurance',
  // Private general (health line)
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'Bajaj Allianz General Insurance',
  'Tata AIG General Insurance',
  'Reliance General Insurance',
  'SBI General Insurance',
  'Kotak Mahindra General Insurance',
  'IFFCO Tokio General Insurance',
  'Cholamandalam MS General Insurance',
  'Royal Sundaram General Insurance',
  'Future Generali India Insurance',
  // Govt schemes
  'Ayushman Bharat PM-JAY',
  'CGHS',
  'ECHS',
  'ESIC',
  'State Govt Health Scheme',
  // Catch-all
  'Other / Self-pay',
];
