import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Search, Mic, FileText, Star,
  BookOpen, Stethoscope, ClipboardList, Send, Copy
} from 'lucide-react';

interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  vitals: { bp: string; pulse: string; temp: string; spo2: string };
  allergies: string[];
  currentMedications: string[];
  recentDiagnoses: string[];
  lastVisit: string;
}

interface QuickTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  usageCount: number;
}

interface OrderSet {
  id: string;
  name: string;
  condition: string;
  orders: { type: string; item: string; details: string }[];
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: '1', name: 'URTI Treatment', category: 'Prescription', content: 'Paracetamol 650mg TDS x 3 days\nCetirizine 10mg OD x 5 days\nSteam inhalation TDS\nGargles with warm salt water', usageCount: 156 },
  { id: '2', name: 'Gastritis Management', category: 'Prescription', content: 'Pantoprazole 40mg OD before breakfast x 14 days\nDomperidone 10mg TDS before meals x 7 days\nAntacid gel 15ml TDS after meals x 7 days', usageCount: 134 },
  { id: '3', name: 'Hypertension Follow-up', category: 'Clinical Note', content: 'BP control: [GOOD/FAIR/POOR]. Current medications continued. Lifestyle modifications advised. Follow-up after [DURATION].', usageCount: 98 },
  { id: '4', name: 'Diabetes Review', category: 'Clinical Note', content: 'Blood sugar levels: Fasting [FBS], PP [PPBS]. HbA1c: [VALUE]. Current regimen [ADEQUATE/NEEDS MODIFICATION]. Diet and exercise counseling done.', usageCount: 87 },
];

const ORDER_SETS: OrderSet[] = [
  {
    id: 'os1',
    name: 'Fever Workup',
    condition: 'Fever of Unknown Origin',
    orders: [
      { type: 'Lab', item: 'Complete Blood Count', details: 'STAT' },
      { type: 'Lab', item: 'Blood Culture x 2', details: 'Before antibiotics' },
      { type: 'Lab', item: 'Urine Routine & Culture', details: 'Morning sample' },
      { type: 'Lab', item: 'Malaria Parasite', details: 'If endemic area' },
      { type: 'Lab', item: 'Dengue NS1/IgM', details: 'If platelet low' },
      { type: 'Radiology', item: 'Chest X-Ray PA', details: 'To rule out pneumonia' },
    ],
  },
  {
    id: 'os2',
    name: 'Chest Pain Evaluation',
    condition: 'Acute Chest Pain',
    orders: [
      { type: 'Lab', item: 'Troponin I/T', details: 'STAT, repeat at 3 & 6 hours' },
      { type: 'Lab', item: 'ECG', details: 'STAT, 12-lead' },
      { type: 'Lab', item: 'D-Dimer', details: 'If PE suspected' },
      { type: 'Radiology', item: 'Chest X-Ray', details: 'Portable if unstable' },
      { type: 'Lab', item: 'CBC, BMP, Coagulation', details: 'Baseline' },
    ],
  },
];

const CURRENT_PATIENT: PatientContext = {
  id: 'P001',
  name: 'Rajesh Kumar',
  age: 52,
  gender: 'Male',
  mrn: 'MRN001234',
  vitals: { bp: '140/90', pulse: '82', temp: '98.6', spo2: '98' },
  allergies: ['Penicillin', 'Sulfa drugs'],
  currentMedications: ['Metformin 500mg BD', 'Atorvastatin 10mg HS', 'Aspirin 75mg OD'],
  recentDiagnoses: ['Type 2 Diabetes Mellitus', 'Hypertension', 'Dyslipidemia'],
  lastVisit: '2024-11-15',
};

export default function DoctorAssistant() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('quick-actions');
  const [searchTerm, setSearchTerm] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [clinicalNote, setClinicalNote] = useState('');

  const handleVoiceToText = () => {
    if (!isRecording) {
      setIsRecording(true);
      showToast('Recording started... (Simulated)', 'success');
      // In production, this would use Web Speech API
      setTimeout(() => {
        setVoiceText('Patient presents with fever for 3 days, cough, and body ache. No shortness of breath. Taking paracetamol at home with mild relief.');
        setIsRecording(false);
        showToast('Recording completed', 'success');
      }, 3000);
    } else {
      setIsRecording(false);
      showToast('Recording stopped', 'success');
    }
  };

  const handleUseTemplate = (template: QuickTemplate) => {
    setClinicalNote(prev => prev + (prev ? '\n\n' : '') + template.content);
    showToast('Template added to note', 'success');
  };

  const handleApplyOrderSet = (orderSet: OrderSet) => {
    showToast(`Order set "${orderSet.name}" applied with ${orderSet.orders.length} orders`, 'success');
  };

  const handleCopyNote = () => {
    navigator.clipboard.writeText(clinicalNote);
    showToast('Note copied to clipboard', 'success');
  };

  const filteredTemplates = QUICK_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctor Assistant</h1>
          <p className="text-slate-600">Clinical documentation and decision support</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Context Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Current Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{CURRENT_PATIENT.name}</h3>
              <p className="text-sm text-slate-600">
                {CURRENT_PATIENT.age}Y / {CURRENT_PATIENT.gender} | {CURRENT_PATIENT.mrn}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">BP:</span> {CURRENT_PATIENT.vitals.bp}
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">Pulse:</span> {CURRENT_PATIENT.vitals.pulse}
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">Temp:</span> {CURRENT_PATIENT.vitals.temp}°F
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">SpO2:</span> {CURRENT_PATIENT.vitals.spo2}%
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-red-600 mb-1">Allergies:</p>
              <div className="flex flex-wrap gap-1">
                {CURRENT_PATIENT.allergies.map((allergy, i) => (
                  <Badge key={i} className="bg-red-100 text-red-800">{allergy}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Current Medications:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                {CURRENT_PATIENT.currentMedications.map((med, i) => (
                  <li key={i}>• {med}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Diagnoses:</p>
              <div className="flex flex-wrap gap-1">
                {CURRENT_PATIENT.recentDiagnoses.map((dx, i) => (
                  <Badge key={i} variant="outline">{dx}</Badge>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t text-sm text-slate-500">
              Last Visit: {CURRENT_PATIENT.lastVisit}
            </div>
          </CardContent>
        </Card>

        {/* Main Work Area */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
              <TabsTrigger value="voice-note">Voice to Text</TabsTrigger>
              <TabsTrigger value="order-sets">Order Sets</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
            </TabsList>

            {/* Quick Actions Tab */}
            <TabsContent value="quick-actions" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">{template.content}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {template.usageCount} uses
                        </span>
                        <Button size="sm" onClick={() => handleUseTemplate(template)}>
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Clinical Note Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Clinical Note
                    </span>
                    <Button size="sm" variant="outline" onClick={handleCopyNote}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    placeholder="Start typing or use templates..."
                    rows={8}
                  />
                  <div className="flex justify-end mt-4">
                    <Button>
                      <Send className="w-4 h-4 mr-2" />
                      Save Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice to Text Tab */}
            <TabsContent value="voice-note" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Voice to Text
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      className={`rounded-full w-24 h-24 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
                      onClick={handleVoiceToText}
                    >
                      <Mic className="w-8 h-8" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-slate-600">
                    {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                  </p>
                  {voiceText && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Transcribed Text:</p>
                      <p className="text-slate-700">{voiceText}</p>
                      <div className="flex justify-end mt-4 gap-2">
                        <Button variant="outline" onClick={() => setClinicalNote(prev => prev + (prev ? '\n\n' : '') + voiceText)}>
                          Add to Note
                        </Button>
                        <Button variant="outline" onClick={() => navigator.clipboard.writeText(voiceText)}>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order Sets Tab */}
            <TabsContent value="order-sets" className="mt-4 space-y-4">
              {ORDER_SETS.map((orderSet) => (
                <Card key={orderSet.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{orderSet.name}</h3>
                        <p className="text-sm text-slate-600">{orderSet.condition}</p>
                      </div>
                      <Button onClick={() => handleApplyOrderSet(orderSet)}>
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Apply Order Set
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {orderSet.orders.map((order, i) => (
                        <div key={i} className="flex items-center gap-4 p-2 bg-slate-50 rounded">
                          <Badge variant="outline">{order.type}</Badge>
                          <span className="font-medium">{order.item}</span>
                          <span className="text-sm text-slate-500">{order.details}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* References Tab */}
            <TabsContent value="references" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Clinical References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Drug Interaction Check</h4>
                      <p className="text-sm text-blue-600 mt-1">
                        Check for potential drug interactions before prescribing
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Open Checker
                      </Button>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Clinical Guidelines</h4>
                      <p className="text-sm text-green-600 mt-1">
                        Access latest clinical guidelines and protocols
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Browse Guidelines
                      </Button>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800">Dosage Calculator</h4>
                      <p className="text-sm text-purple-600 mt-1">
                        Calculate drug dosages based on weight, age, and renal function
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Open Calculator
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
