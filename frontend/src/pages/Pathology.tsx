import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Microscope, Search, FileText, CheckCircle, Clock, Eye,
  Upload, Image, AlertTriangle, RefreshCw, Send, Printer
} from 'lucide-react';

interface PathologyCase {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientAge: number;
  patientGender: string;
  specimenType: string;
  specimenSite: string;
  clinicalHistory: string;
  referringDoctor: string;
  department: string;
  caseType: 'HISTOPATHOLOGY' | 'CYTOLOGY' | 'FROZEN_SECTION' | 'IMMUNOHISTOCHEMISTRY';
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'RECEIVED' | 'GROSSING' | 'PROCESSING' | 'EMBEDDING' | 'SECTIONING' | 'STAINING' | 'EXAMINATION' | 'REPORTED' | 'VERIFIED';
  receivedAt: string;
  grossDescription?: string;
  microscopicFindings?: string;
  diagnosis?: string;
  icdCodes?: string[];
  pathologist?: string;
  images?: string[];
  specialStains?: { name: string; result: string }[];
  ihcMarkers?: { marker: string; result: string; intensity?: string }[];
  reportedAt?: string;
  turnaroundDays?: number;
}

const SPECIMEN_TYPES = [
  'Biopsy', 'Excision', 'Resection', 'Curettage', 'Fine Needle Aspirate',
  'Pap Smear', 'Body Fluid', 'Bone Marrow', 'Lymph Node', 'Skin'
];

const ICD_CODES = [
  { code: 'C50', description: 'Malignant neoplasm of breast' },
  { code: 'C61', description: 'Malignant neoplasm of prostate' },
  { code: 'D05', description: 'Carcinoma in situ of breast' },
  { code: 'K29', description: 'Gastritis and duodenitis' },
  { code: 'N80', description: 'Endometriosis' },
];

const IHC_MARKERS = [
  'ER', 'PR', 'HER2', 'Ki-67', 'p53', 'CK7', 'CK20', 'CD20', 'CD3',
  'TTF-1', 'PSA', 'S100', 'Melan-A', 'CD34', 'Vimentin'
];

export default function Pathology() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [cases, setCases] = useState<PathologyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<PathologyCase | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Report form state
  const [grossDescription, setGrossDescription] = useState('');
  const [microscopicFindings, setMicroscopicFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [selectedIcdCodes, setSelectedIcdCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      // Mock data
      const mockCases: PathologyCase[] = [
        {
          id: '1',
          caseNumber: 'HP-2024-001234',
          patientId: 'P001',
          patientName: 'Sunita Sharma',
          patientMRN: 'MRN001234',
          patientAge: 45,
          patientGender: 'Female',
          specimenType: 'Biopsy',
          specimenSite: 'Right Breast',
          clinicalHistory: 'Palpable lump in right breast for 2 months. BIRADS 4C on mammography.',
          referringDoctor: 'Dr. Meera Patel',
          department: 'General Surgery',
          caseType: 'HISTOPATHOLOGY',
          priority: 'URGENT',
          status: 'EXAMINATION',
          receivedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          caseNumber: 'HP-2024-001235',
          patientId: 'P002',
          patientName: 'Rajesh Kumar',
          patientMRN: 'MRN001235',
          patientAge: 62,
          patientGender: 'Male',
          specimenType: 'Resection',
          specimenSite: 'Prostate',
          clinicalHistory: 'Elevated PSA. Gleason 7 on biopsy.',
          referringDoctor: 'Dr. Amit Shah',
          department: 'Urology',
          caseType: 'HISTOPATHOLOGY',
          priority: 'ROUTINE',
          status: 'PROCESSING',
          receivedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '3',
          caseNumber: 'CY-2024-000456',
          patientId: 'P003',
          patientName: 'Priya Reddy',
          patientMRN: 'MRN001236',
          patientAge: 35,
          patientGender: 'Female',
          specimenType: 'Pap Smear',
          specimenSite: 'Cervix',
          clinicalHistory: 'Routine screening. No symptoms.',
          referringDoctor: 'Dr. Lakshmi Nair',
          department: 'Gynecology',
          caseType: 'CYTOLOGY',
          priority: 'ROUTINE',
          status: 'REPORTED',
          receivedAt: new Date(Date.now() - 259200000).toISOString(),
          diagnosis: 'NILM (Negative for Intraepithelial Lesion or Malignancy)',
          reportedAt: new Date(Date.now() - 86400000).toISOString(),
          pathologist: 'Dr. Sanjay Gupta',
          turnaroundDays: 2,
        },
        {
          id: '4',
          caseNumber: 'IHC-2024-000123',
          patientId: 'P004',
          patientName: 'Anita Desai',
          patientMRN: 'MRN001237',
          patientAge: 52,
          patientGender: 'Female',
          specimenType: 'Biopsy',
          specimenSite: 'Left Breast',
          clinicalHistory: 'Invasive ductal carcinoma. For hormone receptor status.',
          referringDoctor: 'Dr. Meera Patel',
          department: 'Oncology',
          caseType: 'IMMUNOHISTOCHEMISTRY',
          priority: 'URGENT',
          status: 'STAINING',
          receivedAt: new Date(Date.now() - 43200000).toISOString(),
          ihcMarkers: [
            { marker: 'ER', result: 'Positive', intensity: 'Strong (90%)' },
            { marker: 'PR', result: 'Positive', intensity: 'Moderate (60%)' },
            { marker: 'HER2', result: 'Pending' },
            { marker: 'Ki-67', result: 'Pending' },
          ],
        },
      ];
      setCases(mockCases);
    } catch (error) {
      showToast('Failed to fetch cases', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartReport = (caseItem: PathologyCase) => {
    setSelectedCase(caseItem);
    setGrossDescription(caseItem.grossDescription || '');
    setMicroscopicFindings(caseItem.microscopicFindings || '');
    setDiagnosis(caseItem.diagnosis || '');
    setSelectedIcdCodes(caseItem.icdCodes || []);
    setShowReportDialog(true);
  };

  const handleSaveReport = async (finalize: boolean = false) => {
    if (!selectedCase) return;

    try {
      setCases(prev => prev.map(c =>
        c.id === selectedCase.id
          ? {
              ...c,
              grossDescription,
              microscopicFindings,
              diagnosis,
              icdCodes: selectedIcdCodes,
              status: finalize ? 'REPORTED' : c.status,
              reportedAt: finalize ? new Date().toISOString() : undefined,
              pathologist: finalize ? 'Dr. Current User' : undefined,
            }
          : c
      ));

      showToast(finalize ? 'Report finalized' : 'Report saved as draft', 'success');
      setShowReportDialog(false);
    } catch (error) {
      showToast('Failed to save report', 'error');
    }
  };

  const updateCaseStatus = async (caseId: string, newStatus: PathologyCase['status']) => {
    setCases(prev => prev.map(c =>
      c.id === caseId ? { ...c, status: newStatus } : c
    ));
    showToast(`Case moved to ${newStatus}`, 'success');
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientMRN.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.caseType === filterType;
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && !['REPORTED', 'VERIFIED'].includes(c.status)) ||
      (activeTab === 'reported' && c.status === 'REPORTED');
    return matchesSearch && matchesType && matchesTab;
  });

  const stats = {
    received: cases.filter(c => c.status === 'RECEIVED').length,
    inProcess: cases.filter(c => ['GROSSING', 'PROCESSING', 'EMBEDDING', 'SECTIONING', 'STAINING'].includes(c.status)).length,
    examination: cases.filter(c => c.status === 'EXAMINATION').length,
    reported: cases.filter(c => c.status === 'REPORTED').length,
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: 'bg-blue-100 text-blue-800',
      GROSSING: 'bg-purple-100 text-purple-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      EMBEDDING: 'bg-orange-100 text-orange-800',
      SECTIONING: 'bg-pink-100 text-pink-800',
      STAINING: 'bg-indigo-100 text-indigo-800',
      EXAMINATION: 'bg-cyan-100 text-cyan-800',
      REPORTED: 'bg-green-100 text-green-800',
      VERIFIED: 'bg-emerald-100 text-emerald-800',
    };
    return <Badge className={colors[status] || 'bg-slate-100 text-slate-800'}>{status}</Badge>;
  };

  const getCaseTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      HISTOPATHOLOGY: 'bg-blue-500 text-white',
      CYTOLOGY: 'bg-green-500 text-white',
      FROZEN_SECTION: 'bg-red-500 text-white',
      IMMUNOHISTOCHEMISTRY: 'bg-purple-500 text-white',
    };
    return <Badge className={colors[type]}>{type.replace('_', ' ')}</Badge>;
  };

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
          <h1 className="text-2xl font-bold text-slate-800">Pathology</h1>
          <p className="text-slate-600">Histopathology, cytology, and IHC cases</p>
        </div>
        <Button onClick={fetchCases}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Received</p>
                <p className="text-2xl font-bold text-blue-600">{stats.received}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Process</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProcess}</p>
              </div>
              <Microscope className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Awaiting Exam</p>
                <p className="text-2xl font-bold text-purple-600">{stats.examination}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Reported</p>
                <p className="text-2xl font-bold text-green-600">{stats.reported}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by patient, case number, or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Case Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="HISTOPATHOLOGY">Histopathology</SelectItem>
                <SelectItem value="CYTOLOGY">Cytology</SelectItem>
                <SelectItem value="FROZEN_SECTION">Frozen Section</SelectItem>
                <SelectItem value="IMMUNOHISTOCHEMISTRY">IHC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Case List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({cases.filter(c => !['REPORTED', 'VERIFIED'].includes(c.status)).length})</TabsTrigger>
          <TabsTrigger value="reported">Reported ({stats.reported})</TabsTrigger>
          <TabsTrigger value="all">All Cases</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="space-y-4">
            {filteredCases.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Microscope className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No cases found</p>
                </CardContent>
              </Card>
            ) : (
              filteredCases.map((caseItem) => (
                <Card key={caseItem.id} className={caseItem.priority === 'STAT' ? 'border-red-300' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">{caseItem.caseNumber}</span>
                          {getCaseTypeBadge(caseItem.caseType)}
                          {getStatusBadge(caseItem.status)}
                          {caseItem.priority !== 'ROUTINE' && (
                            <Badge className={caseItem.priority === 'STAT' ? 'bg-red-500' : 'bg-orange-500'}>
                              {caseItem.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Patient:</span>
                            <p className="font-medium">{caseItem.patientName}</p>
                            <p className="text-slate-600">{caseItem.patientAge}Y / {caseItem.patientGender}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Specimen:</span>
                            <p className="font-medium">{caseItem.specimenType}</p>
                            <p className="text-slate-600">{caseItem.specimenSite}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Referring:</span>
                            <p className="font-medium">{caseItem.referringDoctor}</p>
                            <p className="text-slate-600">{caseItem.department}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Received:</span>
                            <p className="font-medium">{new Date(caseItem.receivedAt).toLocaleDateString()}</p>
                            {caseItem.turnaroundDays && (
                              <p className="text-slate-600">TAT: {caseItem.turnaroundDays} days</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          <span className="font-medium">History:</span> {caseItem.clinicalHistory}
                        </p>
                        {caseItem.ihcMarkers && caseItem.ihcMarkers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {caseItem.ihcMarkers.map((m, i) => (
                              <Badge key={i} variant="outline" className={
                                m.result === 'Positive' ? 'border-green-500 text-green-700' :
                                m.result === 'Negative' ? 'border-red-500 text-red-700' :
                                'border-yellow-500 text-yellow-700'
                              }>
                                {m.marker}: {m.result} {m.intensity && `(${m.intensity})`}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {caseItem.diagnosis && (
                          <div className="mt-2 p-2 bg-green-50 rounded">
                            <span className="text-sm font-medium text-green-800">Diagnosis:</span>
                            <p className="text-sm text-green-700">{caseItem.diagnosis}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {caseItem.status === 'RECEIVED' && (
                          <Button size="sm" onClick={() => updateCaseStatus(caseItem.id, 'GROSSING')}>
                            Start Grossing
                          </Button>
                        )}
                        {caseItem.status === 'EXAMINATION' && (
                          <Button size="sm" onClick={() => handleStartReport(caseItem)}>
                            <FileText className="w-4 h-4 mr-1" />
                            Create Report
                          </Button>
                        )}
                        {caseItem.status === 'REPORTED' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedCase(caseItem);
                              setShowViewDialog(true);
                            }}>
                              <Eye className="w-4 h-4 mr-1" />
                              View Report
                            </Button>
                            <Button size="sm" variant="outline">
                              <Printer className="w-4 h-4 mr-1" />
                              Print
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            {['RECEIVED', 'GROSSING', 'PROCESSING', 'EMBEDDING', 'SECTIONING', 'STAINING', 'EXAMINATION', 'REPORTED'].map((stage, i) => (
              <div key={stage} className="flex items-center">
                <div className="text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    cases.some(c => c.status === stage) ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {cases.filter(c => c.status === stage).length}
                  </div>
                  <p className="text-xs mt-1 text-slate-600">{stage}</p>
                </div>
                {i < 7 && <div className="w-8 h-0.5 bg-slate-200 mx-1" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pathology Report - {selectedCase?.caseNumber}</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded">
                <div>
                  <p className="text-sm text-slate-500">Patient</p>
                  <p className="font-medium">{selectedCase.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Specimen</p>
                  <p className="font-medium">{selectedCase.specimenType} - {selectedCase.specimenSite}</p>
                </div>
              </div>

              <div>
                <Label>Gross Description</Label>
                <Textarea
                  rows={4}
                  placeholder="Describe the specimen appearance, size, weight, and gross findings..."
                  value={grossDescription}
                  onChange={(e) => setGrossDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Microscopic Findings</Label>
                <Textarea
                  rows={6}
                  placeholder="Describe cellular morphology, tissue architecture, and microscopic observations..."
                  value={microscopicFindings}
                  onChange={(e) => setMicroscopicFindings(e.target.value)}
                />
              </div>

              <div>
                <Label>Diagnosis</Label>
                <Textarea
                  rows={3}
                  placeholder="Final pathological diagnosis..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div>
                <Label>ICD-10 Codes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ICD_CODES.map((icd) => (
                    <Badge
                      key={icd.code}
                      variant={selectedIcdCodes.includes(icd.code) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedIcdCodes.includes(icd.code)) {
                          setSelectedIcdCodes(prev => prev.filter(c => c !== icd.code));
                        } else {
                          setSelectedIcdCodes(prev => [...prev, icd.code]);
                        }
                      }}
                    >
                      {icd.code}: {icd.description}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSaveReport(false)}>
              Save Draft
            </Button>
            <Button onClick={() => handleSaveReport(true)}>
              <Send className="w-4 h-4 mr-2" />
              Finalize Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pathology Report</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">PATHOLOGY REPORT</h2>
                <p className="text-slate-600">{selectedCase.caseNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Patient Name</p>
                  <p className="font-medium">{selectedCase.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">MRN</p>
                  <p className="font-medium">{selectedCase.patientMRN}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Specimen</p>
                  <p className="font-medium">{selectedCase.specimenType} - {selectedCase.specimenSite}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pathologist</p>
                  <p className="font-medium">{selectedCase.pathologist || 'N/A'}</p>
                </div>
              </div>
              {selectedCase.diagnosis && (
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <p className="text-sm font-medium text-green-800">DIAGNOSIS</p>
                  <p className="text-green-700 mt-1">{selectedCase.diagnosis}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            <Button>
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
