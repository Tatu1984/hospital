import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, AlertTriangle, FileText, CheckCircle, Eye, Search, Filter } from 'lucide-react';
import { useToast } from '../components/Toast';
import { PermissionGate } from '../components/PermissionGate';
import api from '../services/api';

interface Incident {
  id: string;
  type: string;
  description: string;
  reportedBy: string;
  reportedByName?: string;
  date: string;
  occurredAt: string;
  location: string;
  severity: string;
  status: string;
  immediateAction?: string;
  patientId?: string;
  patientName?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface Feedback {
  id: string;
  patientId?: string;
  patientName: string;
  department: string;
  rating: number;
  comments: string;
  date: string;
  category?: string;
  isAnonymous?: boolean;
}

const INCIDENT_TYPES = [
  'FALL', 'MEDICATION_ERROR', 'NEEDLE_STICK', 'PATIENT_COMPLAINT',
  'EQUIPMENT_FAILURE', 'INFECTION', 'NEAR_MISS', 'ADVERSE_EVENT', 'OTHER'
];

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

export default function Quality() {
  const { success, error: showError } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [showIncidentDetails, setShowIncidentDetails] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [incidentForm, setIncidentForm] = useState({
    type: '',
    severity: 'MEDIUM',
    location: '',
    description: '',
    immediateAction: '',
    occurredAt: new Date().toISOString().slice(0, 16),
  });

  const [feedbackForm, setFeedbackForm] = useState({
    patientName: '',
    department: '',
    rating: 5,
    comments: '',
    category: 'GENERAL',
    isAnonymous: false,
  });

  useEffect(() => {
    fetchIncidents();
    fetchFeedbacks();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/quality/incidents');
      setIncidents(response.data);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      showError('Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await api.get('/api/quality/feedbacks');
      setFeedbacks(response.data);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    }
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/quality/incidents', incidentForm);
      success('Incident reported successfully');
      setShowAddIncident(false);
      setIncidentForm({
        type: '',
        severity: 'MEDIUM',
        location: '',
        description: '',
        immediateAction: '',
        occurredAt: new Date().toISOString().slice(0, 16),
      });
      fetchIncidents();
    } catch (err: any) {
      showError('Failed to report incident', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/quality/feedbacks', feedbackForm);
      success('Feedback submitted successfully');
      setShowAddFeedback(false);
      setFeedbackForm({
        patientName: '',
        department: '',
        rating: 5,
        comments: '',
        category: 'GENERAL',
        isAnonymous: false,
      });
      fetchFeedbacks();
    } catch (err: any) {
      showError('Failed to submit feedback', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIncidentStatus = async (id: string, status: string, resolution?: string) => {
    try {
      await api.put(`/api/quality/incidents/${id}`, { status, resolution });
      success('Incident updated successfully');
      fetchIncidents();
      setShowIncidentDetails(false);
    } catch (err: any) {
      showError('Failed to update incident', err.response?.data?.message);
    }
  };

  const viewIncidentDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowIncidentDetails(true);
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const pendingIncidents = incidents.filter(i => i.status === 'PENDING' || i.status === 'INVESTIGATING');
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '0';
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'CLOSED').length;

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quality, Compliance & Feedback</h1>
          <p className="text-slate-600">Incident reporting, patient feedback, and quality metrics</p>
        </div>
        <div className="flex gap-2">
          <PermissionGate permission="quality:manage">
            <Dialog open={showAddIncident} onOpenChange={setShowAddIncident}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Report Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Report New Incident</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddIncident} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Incident Type *</Label>
                      <Select value={incidentForm.type} onValueChange={(v) => setIncidentForm({...incidentForm, type: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {INCIDENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity *</Label>
                      <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({...incidentForm, severity: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITY_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Input
                      value={incidentForm.location}
                      onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})}
                      placeholder="e.g., Ward 3, Room 105"
                      required
                    />
                  </div>
                  <div>
                    <Label>Occurred At *</Label>
                    <Input
                      type="datetime-local"
                      value={incidentForm.occurredAt}
                      onChange={(e) => setIncidentForm({...incidentForm, occurredAt: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      value={incidentForm.description}
                      onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
                      placeholder="Detailed description of the incident"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <Label>Immediate Action Taken</Label>
                    <Textarea
                      value={incidentForm.immediateAction}
                      onChange={(e) => setIncidentForm({...incidentForm, immediateAction: e.target.value})}
                      placeholder="What actions were taken immediately?"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddIncident(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !incidentForm.type || !incidentForm.description}>
                      {loading ? 'Submitting...' : 'Report Incident'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </PermissionGate>

          <Dialog open={showAddFeedback} onOpenChange={setShowAddFeedback}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Star className="w-4 h-4" />
                Add Feedback
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Patient Feedback</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFeedback} className="space-y-4">
                <div>
                  <Label>Patient Name</Label>
                  <Input
                    value={feedbackForm.patientName}
                    onChange={(e) => setFeedbackForm({...feedbackForm, patientName: e.target.value})}
                    placeholder="Enter patient name (or leave blank for anonymous)"
                  />
                </div>
                <div>
                  <Label>Department *</Label>
                  <Select value={feedbackForm.department} onValueChange={(v) => setFeedbackForm({...feedbackForm, department: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPD">OPD</SelectItem>
                      <SelectItem value="IPD">IPD</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Laboratory">Laboratory</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="Radiology">Radiology</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rating *</Label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFeedbackForm({...feedbackForm, rating})}
                        className={`p-2 rounded ${feedbackForm.rating >= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        <Star className={`w-6 h-6 ${feedbackForm.rating >= rating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                    <span className="ml-2 self-center font-medium">{feedbackForm.rating}/5</span>
                  </div>
                </div>
                <div>
                  <Label>Comments *</Label>
                  <Textarea
                    value={feedbackForm.comments}
                    onChange={(e) => setFeedbackForm({...feedbackForm, comments: e.target.value})}
                    placeholder="Share your experience..."
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddFeedback(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !feedbackForm.department || !feedbackForm.comments}>
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={criticalIncidents > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${criticalIncidents > 0 ? 'text-red-600' : ''}`} />
              Critical Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${criticalIncidents > 0 ? 'text-red-600' : ''}`}>
              {criticalIncidents}
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingIncidents.length}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <Star className="w-4 h-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgRating}/5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total Feedbacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbacks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="incidents">
            <TabsList>
              <TabsTrigger value="incidents">
                Incidents ({filteredIncidents.length})
              </TabsTrigger>
              <TabsTrigger value="feedback">
                Patient Feedback ({feedbacks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incidents" className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search incidents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    {SEVERITY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No incidents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>{new Date(incident.occurredAt || incident.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline">{incident.type.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell>{incident.location}</TableCell>
                        <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                        <TableCell>
                          <Badge variant={
                            incident.severity === 'CRITICAL' ? 'destructive' :
                            incident.severity === 'HIGH' ? 'destructive' :
                            incident.severity === 'MEDIUM' ? 'secondary' : 'outline'
                          }>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            incident.status === 'RESOLVED' || incident.status === 'CLOSED' ? 'default' :
                            incident.status === 'INVESTIGATING' ? 'secondary' : 'outline'
                          }>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => viewIncidentDetails(incident)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <PermissionGate permission="quality:manage">
                              {incident.status !== 'CLOSED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600"
                                  onClick={() => handleUpdateIncidentStatus(incident.id, 'RESOLVED')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="feedback">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No feedback received yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedbacks.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell>{new Date(feedback.date).toLocaleDateString()}</TableCell>
                        <TableCell>{feedback.isAnonymous ? 'Anonymous' : feedback.patientName || 'N/A'}</TableCell>
                        <TableCell>{feedback.department}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{feedback.comments}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Incident Details Dialog */}
      <Dialog open={showIncidentDetails} onOpenChange={setShowIncidentDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Type</Label>
                  <p className="font-medium">{selectedIncident.type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Severity</Label>
                  <Badge variant={selectedIncident.severity === 'CRITICAL' ? 'destructive' : 'outline'}>
                    {selectedIncident.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Location</Label>
                  <p className="font-medium">{selectedIncident.location}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Occurred At</Label>
                  <p className="font-medium">
                    {new Date(selectedIncident.occurredAt || selectedIncident.date).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge>{selectedIncident.status}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Reported By</Label>
                  <p className="font-medium">{selectedIncident.reportedByName || selectedIncident.reportedBy}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Description</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{selectedIncident.description}</p>
              </div>
              {selectedIncident.immediateAction && (
                <div>
                  <Label className="text-gray-500">Immediate Action Taken</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded">{selectedIncident.immediateAction}</p>
                </div>
              )}
              {selectedIncident.resolution && (
                <div>
                  <Label className="text-gray-500">Resolution</Label>
                  <p className="mt-1 p-3 bg-green-50 rounded">{selectedIncident.resolution}</p>
                </div>
              )}

              <PermissionGate permission="quality:manage">
                {selectedIncident.status !== 'CLOSED' && (
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    {selectedIncident.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateIncidentStatus(selectedIncident.id, 'INVESTIGATING')}
                      >
                        Start Investigation
                      </Button>
                    )}
                    {selectedIncident.status !== 'RESOLVED' && (
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateIncidentStatus(selectedIncident.id, 'RESOLVED')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                    {selectedIncident.status === 'RESOLVED' && (
                      <Button
                        onClick={() => handleUpdateIncidentStatus(selectedIncident.id, 'CLOSED')}
                      >
                        Close Incident
                      </Button>
                    )}
                  </div>
                )}
              </PermissionGate>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
