import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/Toast';
import {
  ClipboardList, Search, FileText, BookOpen, Activity,
  RefreshCw, Star, Copy, Plus, CheckCircle
} from 'lucide-react';

interface ClinicalProtocol {
  id: string;
  name: string;
  category: string;
  department: string;
  version: string;
  lastUpdated: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  description: string;
  steps: { order: number; action: string; notes?: string }[];
  references: string[];
  author: string;
}

interface ClinicalTemplate {
  id: string;
  name: string;
  type: 'PRESCRIPTION' | 'CLINICAL_NOTE' | 'DISCHARGE' | 'REFERRAL' | 'CONSENT';
  specialty: string;
  content: string;
  usageCount: number;
  rating: number;
  author: string;
}

interface CarePathway {
  id: string;
  name: string;
  condition: string;
  duration: string;
  phases: { name: string; duration: string; activities: string[] }[];
  outcomes: string[];
  status: 'ACTIVE' | 'DRAFT';
}

const DEPARTMENTS = ['Cardiology', 'Orthopedics', 'Neurology', 'General Medicine', 'Pediatrics', 'Gynecology'];

export default function OPDClinical() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('protocols');
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [pathways, setPathways] = useState<CarePathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock protocols
      setProtocols([
        {
          id: '1',
          name: 'Acute Myocardial Infarction Management',
          category: 'Emergency',
          department: 'Cardiology',
          version: '3.0',
          lastUpdated: '2024-11-15',
          status: 'ACTIVE',
          description: 'Evidence-based protocol for acute MI management in ED and ICU',
          steps: [
            { order: 1, action: 'Initial assessment and ECG within 10 minutes', notes: 'Time is muscle' },
            { order: 2, action: 'Aspirin 325mg STAT', notes: 'Unless contraindicated' },
            { order: 3, action: 'Oxygen if SpO2 < 94%' },
            { order: 4, action: 'IV access and labs (Troponin, CBC, BMP, Coagulation)' },
            { order: 5, action: 'Cardiology consultation STAT' },
            { order: 6, action: 'Consider PCI within 90 minutes or thrombolysis within 30 minutes' },
          ],
          references: ['ACC/AHA Guidelines 2021', 'ESC Guidelines 2020'],
          author: 'Dr. Cardiology Chief',
        },
        {
          id: '2',
          name: 'Diabetic Ketoacidosis Protocol',
          category: 'Emergency',
          department: 'General Medicine',
          version: '2.5',
          lastUpdated: '2024-10-20',
          status: 'ACTIVE',
          description: 'Standardized DKA management protocol for adult patients',
          steps: [
            { order: 1, action: 'Confirm diagnosis: Blood glucose > 250, pH < 7.3, Ketones positive' },
            { order: 2, action: 'IV Normal Saline 1L bolus, then 500ml/hour' },
            { order: 3, action: 'Regular Insulin IV 0.1 units/kg/hour after potassium check' },
            { order: 4, action: 'Potassium replacement as per protocol' },
            { order: 5, action: 'Monitor glucose hourly, electrolytes every 2-4 hours' },
          ],
          references: ['ADA Guidelines 2024'],
          author: 'Dr. Endocrinology Chief',
        },
      ]);

      // Mock templates
      setTemplates([
        {
          id: 't1',
          name: 'Hypertension Follow-up Note',
          type: 'CLINICAL_NOTE',
          specialty: 'Cardiology',
          content: 'Patient presents for hypertension follow-up. Current medications: [MEDICATIONS]. BP today: [BP]. Compliance: [COMPLIANCE]. Side effects: [SIDE_EFFECTS]. Assessment: [ASSESSMENT]. Plan: [PLAN].',
          usageCount: 245,
          rating: 4.5,
          author: 'Dr. Cardiologist',
        },
        {
          id: 't2',
          name: 'Diabetes Prescription Template',
          type: 'PRESCRIPTION',
          specialty: 'General Medicine',
          content: 'Metformin 500mg BD with meals\nGliclazide 80mg OD before breakfast\nAtorvastatin 10mg HS\nAspirin 75mg OD after lunch',
          usageCount: 189,
          rating: 4.8,
          author: 'Dr. Physician',
        },
        {
          id: 't3',
          name: 'General Consent Form',
          type: 'CONSENT',
          specialty: 'General',
          content: 'I, [PATIENT_NAME], hereby consent to [PROCEDURE]. I understand the risks and benefits have been explained to me.',
          usageCount: 500,
          rating: 4.2,
          author: 'Medical Director',
        },
      ]);

      // Mock care pathways
      setPathways([
        {
          id: 'cp1',
          name: 'Total Knee Replacement Pathway',
          condition: 'Osteoarthritis - Knee',
          duration: '12 weeks',
          phases: [
            { name: 'Pre-operative', duration: '2 weeks', activities: ['Pre-anesthesia check', 'Blood bank arrangement', 'Physiotherapy education'] },
            { name: 'Inpatient', duration: '5-7 days', activities: ['Surgery', 'Post-op monitoring', 'Early mobilization', 'Pain management'] },
            { name: 'Rehabilitation', duration: '8-10 weeks', activities: ['Physiotherapy sessions', 'ROM exercises', 'Strength training', 'Walking practice'] },
          ],
          outcomes: ['Pain relief', 'Improved mobility', 'Return to daily activities'],
          status: 'ACTIVE',
        },
        {
          id: 'cp2',
          name: 'COPD Exacerbation Management',
          condition: 'COPD Acute Exacerbation',
          duration: '7-14 days',
          phases: [
            { name: 'Acute', duration: '3-5 days', activities: ['Bronchodilators', 'Steroids', 'Antibiotics if indicated', 'Oxygen therapy'] },
            { name: 'Stabilization', duration: '3-5 days', activities: ['Medication adjustment', 'Pulmonary rehabilitation initiation'] },
            { name: 'Discharge', duration: '1-2 days', activities: ['Inhaler technique education', 'Action plan review', 'Follow-up scheduling'] },
          ],
          outcomes: ['Symptom relief', 'Reduced readmission', 'Improved quality of life'],
          status: 'ACTIVE',
        },
      ]);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = (template: ClinicalTemplate) => {
    navigator.clipboard.writeText(template.content);
    showToast('Template copied to clipboard', 'success');
  };

  const filteredProtocols = protocols.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || p.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">OPD Clinical Management</h1>
          <p className="text-slate-600">Clinical protocols, templates, and care pathways</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Protocols</p>
                <p className="text-2xl font-bold text-blue-600">{protocols.filter(p => p.status === 'ACTIVE').length}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Templates</p>
                <p className="text-2xl font-bold text-green-600">{templates.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Care Pathways</p>
                <p className="text-2xl font-bold text-purple-600">{pathways.length}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">References</p>
                <p className="text-2xl font-bold text-orange-600">15</p>
              </div>
              <BookOpen className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="protocols">Clinical Protocols</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="pathways">Care Pathways</TabsTrigger>
        </TabsList>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search protocols..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredProtocols.map((protocol) => (
              <Card key={protocol.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{protocol.name}</h3>
                        <Badge className={protocol.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {protocol.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{protocol.description}</p>
                      <div className="flex gap-4 text-sm text-slate-500 mt-2">
                        <span>{protocol.department}</span>
                        <span>v{protocol.version}</span>
                        <span>Updated: {protocol.lastUpdated}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">View Full</Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Steps:</p>
                    <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                      {protocol.steps.slice(0, 4).map((step) => (
                        <li key={step.order}>{step.action}</li>
                      ))}
                      {protocol.steps.length > 4 && (
                        <li className="text-slate-400">...and {protocol.steps.length - 4} more steps</li>
                      )}
                    </ol>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {protocol.references.map((ref, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{ref}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge variant="outline">{template.type.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{template.specialty}</p>
                  <div className="p-2 bg-slate-50 rounded text-sm text-slate-600 mb-4 max-h-24 overflow-hidden">
                    {template.content.substring(0, 150)}...
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{template.rating}</span>
                      <span>|</span>
                      <span>{template.usageCount} uses</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleCopyTemplate(template)}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Care Pathways Tab */}
        <TabsContent value="pathways" className="mt-4">
          <div className="space-y-4">
            {pathways.map((pathway) => (
              <Card key={pathway.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{pathway.name}</h3>
                      <p className="text-sm text-slate-600">{pathway.condition}</p>
                      <p className="text-sm text-slate-500">Duration: {pathway.duration}</p>
                    </div>
                    <Badge className={pathway.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {pathway.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {pathway.phases.map((phase, i) => (
                      <div key={i} className="flex-shrink-0 w-64 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                            {i + 1}
                          </div>
                          <h4 className="font-medium">{phase.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{phase.duration}</p>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {phase.activities.map((activity, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 mt-1 text-green-500" />
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Expected Outcomes:</p>
                    <div className="flex flex-wrap gap-2">
                      {pathway.outcomes.map((outcome, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{outcome}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
