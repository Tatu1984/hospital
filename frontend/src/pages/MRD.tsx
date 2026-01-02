import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Archive,
  CheckCircle,
  BarChart3,
  FileBox,
  Send,
  Lock,
  Code,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MedicalRecord {
  id: string;
  patientId: string;
  recordType: string;
  recordCategory: string;
  title: string;
  description?: string;
  icdCodes: string[];
  cptCodes: string[];
  createdByName: string;
  reviewedByName?: string;
  status: string;
  isConfidential: boolean;
  createdAt: string;
  documentUrl?: string;
}

interface ReleaseRequest {
  id: string;
  patientId: string;
  requestedByName: string;
  requestedByType: string;
  purpose: string;
  recordTypes: string[];
  deliveryMethod: string;
  status: string;
  createdAt: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

interface ICD10Code {
  code: string;
  shortDescription: string;
  category: string;
}

interface DashboardStats {
  totalRecords: number;
  recordsByType: Record<string, number>;
  recordsByCategory: Record<string, number>;
  pendingRequests: number;
  completedRequestsToday: number;
  recordsCreatedToday: number;
  archivedRecords: number;
}

export default function MRD() {
  const { token } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [_loading, setLoading] = useState(false);

  // Dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Records
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [showCodingDialog, setShowCodingDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // Release Requests
  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReleaseRequest | null>(null);

  // ICD-10 Search
  const [icdSearch, setIcdSearch] = useState('');
  const [icdResults, setIcdResults] = useState<ICD10Code[]>([]);

  // Form states
  const [recordForm, setRecordForm] = useState({
    patientId: '',
    recordType: '',
    recordCategory: 'clinical',
    title: '',
    description: '',
    isConfidential: false,
  });

  const [codingForm, setCodingForm] = useState({
    codeType: 'icd10',
    code: '',
    description: '',
    isPrimary: false,
    notes: '',
  });

  const [requestForm, setRequestForm] = useState({
    patientId: '',
    requestedByType: 'patient',
    relationship: '',
    purpose: 'treatment',
    recordTypes: [] as string[],
    deliveryMethod: 'email',
    email: '',
    phone: '',
    notes: '',
  });

  const [reviewForm, setReviewForm] = useState({
    status: 'approved',
    denialReason: '',
    notes: '',
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch functions
  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mrd/dashboard`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (recordSearch) params.append('search', recordSearch);
      if (recordTypeFilter !== 'all') params.append('recordType', recordTypeFilter);

      const res = await fetch(`${API_BASE}/api/mrd/records?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/mrd/release-requests`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchICD10 = async (query: string) => {
    if (query.length < 2) {
      setIcdResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/mrd/icd10/search?q=${encodeURIComponent(query)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setIcdResults(data);
      }
    } catch (err) {
      console.error('Failed to search ICD-10:', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchRecords();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'records') fetchRecords();
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'dashboard') fetchDashboard();
  }, [activeTab]);

  // Record handlers
  const handleSaveRecord = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mrd/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify(recordForm),
      });

      if (res.ok) {
        toast.success( 'Medical record created');
        setShowRecordDialog(false);
        resetRecordForm();
        fetchRecords();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to create record');
      }
    } catch (err) {
      toast.error( 'Failed to create record');
    }
  };

  const handleArchiveRecord = async (record: MedicalRecord) => {
    if (!confirm('Are you sure you want to archive this record?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/mrd/records/${record.id}/archive`, {
        method: 'PUT',
        headers,
      });

      if (res.ok) {
        toast.success( 'Record archived');
        fetchRecords();
        fetchDashboard();
      }
    } catch (err) {
      toast.error( 'Failed to archive record');
    }
  };

  const handleReviewRecord = async (record: MedicalRecord) => {
    try {
      const res = await fetch(`${API_BASE}/api/mrd/records/${record.id}/review`, {
        method: 'PUT',
        headers,
      });

      if (res.ok) {
        toast.success( 'Record reviewed');
        fetchRecords();
      }
    } catch (err) {
      toast.error( 'Failed to review record');
    }
  };

  const handleAddCoding = async () => {
    if (!selectedRecord) return;

    try {
      const res = await fetch(`${API_BASE}/api/mrd/records/${selectedRecord.id}/coding`, {
        method: 'POST',
        headers,
        body: JSON.stringify(codingForm),
      });

      if (res.ok) {
        toast.success( 'Coding added');
        setShowCodingDialog(false);
        setCodingForm({
          codeType: 'icd10',
          code: '',
          description: '',
          isPrimary: false,
          notes: '',
        });
        fetchRecords();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to add coding');
      }
    } catch (err) {
      toast.error( 'Failed to add coding');
    }
  };

  const resetRecordForm = () => {
    setRecordForm({
      patientId: '',
      recordType: '',
      recordCategory: 'clinical',
      title: '',
      description: '',
      isConfidential: false,
    });
  };

  // Request handlers
  const handleSubmitRequest = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mrd/release-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestForm),
      });

      if (res.ok) {
        toast.success( 'Release request submitted');
        setShowRequestDialog(false);
        resetRequestForm();
        fetchRequests();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error( 'Failed to submit request');
    }
  };

  const handleReviewRequest = async () => {
    if (!selectedRequest) return;

    try {
      const res = await fetch(`${API_BASE}/api/mrd/release-requests/${selectedRequest.id}/review`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(reviewForm),
      });

      if (res.ok) {
        toast.success( 'Request reviewed');
        setShowReviewDialog(false);
        setSelectedRequest(null);
        fetchRequests();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to review request');
      }
    } catch (err) {
      toast.error( 'Failed to review request');
    }
  };

  const handleCompleteRequest = async (request: ReleaseRequest) => {
    try {
      const res = await fetch(`${API_BASE}/api/mrd/release-requests/${request.id}/complete`, {
        method: 'PUT',
        headers,
      });

      if (res.ok) {
        toast.success( 'Request completed');
        fetchRequests();
        fetchDashboard();
      }
    } catch (err) {
      toast.error( 'Failed to complete request');
    }
  };

  const resetRequestForm = () => {
    setRequestForm({
      patientId: '',
      requestedByType: 'patient',
      relationship: '',
      purpose: 'treatment',
      recordTypes: [],
      deliveryMethod: 'email',
      email: '',
      phone: '',
      notes: '',
    });
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800',
      restricted: 'bg-orange-100 text-orange-800',
      deleted: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      partially_approved: 'bg-blue-100 text-blue-800',
      denied: 'bg-red-100 text-red-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const recordTypes = [
    'admission',
    'discharge_summary',
    'opd_note',
    'lab_report',
    'radiology',
    'surgery',
    'prescription',
    'consent',
    'nursing_note',
    'consultation',
    'progress_note',
  ];

  const recordCategories = ['clinical', 'administrative', 'legal', 'research'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <FileText className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Medical Records Department</h1>
            <p className="text-slate-500">Document management, coding, and release requests</p>
          </div>
        </div>
        <Button onClick={() => { fetchDashboard(); fetchRecords(); fetchRequests(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileBox className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="coding" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            ICD Coding
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Release Requests
          </TabsTrigger>
          <TabsTrigger value="archives" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archives
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">{stats?.totalRecords || 0}</div>
                <p className="text-sm text-slate-500 mt-1">
                  Today: {stats?.recordsCreatedToday || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats?.pendingRequests || 0}</div>
                <p className="text-sm text-slate-500 mt-1">
                  Completed today: {stats?.completedRequestsToday || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Archived Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">{stats?.archivedRecords || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Records by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats?.recordsByType && Object.entries(stats.recordsByType).slice(0, 4).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <Button onClick={() => { setActiveTab('records'); setShowRecordDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
              <Button variant="outline" onClick={() => { setActiveTab('requests'); setShowRequestDialog(true); }}>
                <Send className="h-4 w-4 mr-2" />
                New Release Request
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('coding')}>
                <Code className="h-4 w-4 mr-2" />
                ICD-10 Lookup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Medical Records</CardTitle>
                <Button onClick={() => { resetRecordForm(); setShowRecordDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Record
                </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search records..."
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={recordTypeFilter} onValueChange={(v) => { setRecordTypeFilter(v); }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Record Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {recordTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchRecords}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>ICD Codes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.isConfidential && <Lock className="h-4 w-4 text-red-500" />}
                          <span className="font-medium">{record.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{record.recordType.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="capitalize">{record.recordCategory}</TableCell>
                      <TableCell>
                        {record.icdCodes.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {record.icdCodes.slice(0, 2).map((code, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{code}</Badge>
                            ))}
                            {record.icdCodes.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{record.icdCodes.length - 2}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">No codes</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowCodingDialog(true);
                            }}
                            title="Add Coding"
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReviewRecord(record)}
                            title="Review"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleArchiveRecord(record)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ICD Coding Tab */}
        <TabsContent value="coding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ICD-10 Code Search</CardTitle>
                <CardDescription>Search for diagnosis codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Search ICD-10 Codes</Label>
                    <Input
                      placeholder="Enter code or description..."
                      value={icdSearch}
                      onChange={(e) => {
                        setIcdSearch(e.target.value);
                        searchICD10(e.target.value);
                      }}
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {icdResults.length > 0 ? (
                      <div className="space-y-2">
                        {icdResults.map((code) => (
                          <div
                            key={code.code}
                            className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              setCodingForm({
                                ...codingForm,
                                codeType: 'icd10',
                                code: code.code,
                                description: code.shortDescription,
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{code.code}</Badge>
                              <span className="text-xs text-slate-500">{code.category}</span>
                            </div>
                            <p className="text-sm mt-1">{code.shortDescription}</p>
                          </div>
                        ))}
                      </div>
                    ) : icdSearch.length >= 2 ? (
                      <p className="text-center text-slate-500 py-4">No codes found</p>
                    ) : (
                      <p className="text-center text-slate-500 py-4">Enter at least 2 characters to search</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Records Pending Coding</CardTitle>
                <CardDescription>Clinical records without ICD codes</CardDescription>
              </CardHeader>
              <CardContent>
                {records.filter(r => r.icdCodes.length === 0 && r.recordCategory === 'clinical').length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {records
                      .filter(r => r.icdCodes.length === 0 && r.recordCategory === 'clinical')
                      .map(record => (
                        <div key={record.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{record.title}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowCodingDialog(true);
                              }}
                            >
                              Add Code
                            </Button>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {record.recordType.replace(/_/g, ' ')} - {formatDate(record.createdAt)}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-4">All clinical records are coded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Release Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Release Requests</CardTitle>
                <Button onClick={() => { resetRequestForm(); setShowRequestDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.patientId}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{request.requestedByName}</span>
                          <span className="text-xs text-slate-500 block capitalize">
                            ({request.requestedByType})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{request.purpose}</TableCell>
                      <TableCell className="capitalize">{request.deliveryMethod}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(request.status)}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setReviewForm({ status: 'approved', denialReason: '', notes: '' });
                                setShowReviewDialog(true);
                              }}
                            >
                              Review
                            </Button>
                          )}
                          {request.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteRequest(request)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No release requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archives Tab */}
        <TabsContent value="archives">
          <Card>
            <CardHeader>
              <CardTitle>Archived Records</CardTitle>
              <CardDescription>View and manage archived medical records</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Archived Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.filter(r => r.status === 'archived').map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.title}</TableCell>
                      <TableCell className="capitalize">{record.recordType.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="font-mono text-sm">{record.patientId}</TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {records.filter(r => r.status === 'archived').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No archived records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Record Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Medical Record</DialogTitle>
            <DialogDescription>Create a new medical record entry</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Patient ID *</Label>
              <Input
                value={recordForm.patientId}
                onChange={(e) => setRecordForm({ ...recordForm, patientId: e.target.value })}
                placeholder="Enter patient ID"
              />
            </div>
            <div>
              <Label>Record Type *</Label>
              <Select value={recordForm.recordType} onValueChange={(v) => setRecordForm({ ...recordForm, recordType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {recordTypes.map(type => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={recordForm.recordCategory} onValueChange={(v) => setRecordForm({ ...recordForm, recordCategory: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recordCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={recordForm.isConfidential}
                onChange={(e) => setRecordForm({ ...recordForm, isConfidential: e.target.checked })}
                className="rounded"
              />
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Confidential
              </Label>
            </div>
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input
                value={recordForm.title}
                onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                placeholder="Record title"
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={recordForm.description}
                onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                placeholder="Additional details"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRecord}>Create Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Coding Dialog */}
      <Dialog open={showCodingDialog} onOpenChange={setShowCodingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coding</DialogTitle>
            <DialogDescription>Add ICD/CPT codes to: {selectedRecord?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code Type *</Label>
              <Select value={codingForm.codeType} onValueChange={(v) => setCodingForm({ ...codingForm, codeType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="icd10">ICD-10</SelectItem>
                  <SelectItem value="icd9">ICD-9</SelectItem>
                  <SelectItem value="cpt">CPT</SelectItem>
                  <SelectItem value="hcpcs">HCPCS</SelectItem>
                  <SelectItem value="drg">DRG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Code *</Label>
              <Input
                value={codingForm.code}
                onChange={(e) => setCodingForm({ ...codingForm, code: e.target.value })}
                placeholder="Enter code"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                value={codingForm.description}
                onChange={(e) => setCodingForm({ ...codingForm, description: e.target.value })}
                placeholder="Code description"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={codingForm.isPrimary}
                onChange={(e) => setCodingForm({ ...codingForm, isPrimary: e.target.checked })}
                className="rounded"
              />
              <Label>Primary Diagnosis</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={codingForm.notes}
                onChange={(e) => setCodingForm({ ...codingForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodingDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCoding}>Add Coding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Release Request</DialogTitle>
            <DialogDescription>Request release of medical records</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Patient ID *</Label>
              <Input
                value={requestForm.patientId}
                onChange={(e) => setRequestForm({ ...requestForm, patientId: e.target.value })}
                placeholder="Enter patient ID"
              />
            </div>
            <div>
              <Label>Requested By *</Label>
              <Select value={requestForm.requestedByType} onValueChange={(v) => setRequestForm({ ...requestForm, requestedByType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="family">Family Member</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose *</Label>
              <Select value={requestForm.purpose} onValueChange={(v) => setRequestForm({ ...requestForm, purpose: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="employment">Employment</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Method *</Label>
              <Select value={requestForm.deliveryMethod} onValueChange={(v) => setRequestForm({ ...requestForm, deliveryMethod: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="mail">Mail</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="portal">Patient Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={requestForm.email}
                onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={requestForm.phone}
                onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                placeholder="Additional details"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Release Request</DialogTitle>
            <DialogDescription>Review and approve or deny this request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Decision *</Label>
              <Select value={reviewForm.status} onValueChange={(v) => setReviewForm({ ...reviewForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="partially_approved">Partially Approve</SelectItem>
                  <SelectItem value="denied">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reviewForm.status === 'denied' && (
              <div>
                <Label>Denial Reason *</Label>
                <Textarea
                  value={reviewForm.denialReason}
                  onChange={(e) => setReviewForm({ ...reviewForm, denialReason: e.target.value })}
                  placeholder="Reason for denial"
                  rows={2}
                />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={reviewForm.notes}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button onClick={handleReviewRequest}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
