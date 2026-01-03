import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Search, Plus, Calendar, Clock, User,
  CheckCircle, FileText, RefreshCw, Activity
} from 'lucide-react';

interface PhysiotherapySession {
  id: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientAge: number;
  diagnosis: string;
  referringDoctor: string;
  therapist: string;
  sessionNumber: number;
  totalSessions: number;
  date: string;
  time: string;
  duration: number; // minutes
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  treatmentPlan?: string;
  exercises?: { name: string; sets: number; reps: number; notes?: string }[];
  progressNotes?: string;
  painLevel?: number; // 1-10
  mobilityScore?: number; // 1-10
  goals?: string[];
}

interface TreatmentProtocol {
  id: string;
  name: string;
  condition: string;
  duration: string;
  sessions: number;
  exercises: string[];
  description: string;
}

const THERAPISTS = ['Dr. Ravi Kumar', 'Dr. Anita Sharma', 'Dr. Priya Singh', 'Dr. Suresh Patel'];

const TREATMENT_PROTOCOLS: TreatmentProtocol[] = [
  {
    id: 'tp1',
    name: 'Post-Knee Replacement Rehab',
    condition: 'Total Knee Replacement',
    duration: '8-12 weeks',
    sessions: 24,
    exercises: ['Quad sets', 'Straight leg raises', 'Knee bending', 'Walking', 'Stair climbing'],
    description: 'Comprehensive rehabilitation protocol for post TKR patients',
  },
  {
    id: 'tp2',
    name: 'Lower Back Pain Protocol',
    condition: 'Chronic Lower Back Pain',
    duration: '4-6 weeks',
    sessions: 12,
    exercises: ['Core strengthening', 'McKenzie exercises', 'Hip stretches', 'Posture training'],
    description: 'Evidence-based protocol for chronic LBP management',
  },
  {
    id: 'tp3',
    name: 'Frozen Shoulder Rehab',
    condition: 'Adhesive Capsulitis',
    duration: '6-8 weeks',
    sessions: 18,
    exercises: ['Pendulum exercises', 'Wall climbing', 'External rotation', 'Stretching'],
    description: 'Progressive mobilization for frozen shoulder',
  },
  {
    id: 'tp4',
    name: 'Stroke Rehabilitation',
    condition: 'Post-Stroke Hemiparesis',
    duration: '12-24 weeks',
    sessions: 48,
    exercises: ['ROM exercises', 'Strengthening', 'Balance training', 'Gait training', 'ADL training'],
    description: 'Comprehensive neuro-rehabilitation program',
  },
];

export default function Physiotherapy() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState<PhysiotherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTherapist, setFilterTherapist] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PhysiotherapySession | null>(null);

  const [progressData, setProgressData] = useState({
    painLevel: 5,
    mobilityScore: 5,
    notes: '',
  });

  useEffect(() => {
    fetchSessions();
  }, [selectedDate]);

  const fetchSessions = async () => {
    try {
      // Mock sessions
      setSessions([
        {
          id: '1',
          patientId: 'P001',
          patientName: 'Ramesh Sharma',
          patientMRN: 'MRN001234',
          patientAge: 58,
          diagnosis: 'Total Knee Replacement - Right',
          referringDoctor: 'Dr. Orthopedic Surgeon',
          therapist: 'Dr. Ravi Kumar',
          sessionNumber: 8,
          totalSessions: 24,
          date: selectedDate,
          time: '09:00',
          duration: 45,
          status: 'COMPLETED',
          exercises: [
            { name: 'Quad sets', sets: 3, reps: 10 },
            { name: 'Straight leg raises', sets: 3, reps: 10 },
            { name: 'Knee bending', sets: 3, reps: 15 },
          ],
          progressNotes: 'Good progress. ROM improved to 95 degrees. Walking with walker.',
          painLevel: 4,
          mobilityScore: 6,
          goals: ['Achieve 120 degrees ROM', 'Walk without support'],
        },
        {
          id: '2',
          patientId: 'P002',
          patientName: 'Sunita Patel',
          patientMRN: 'MRN001235',
          patientAge: 45,
          diagnosis: 'Frozen Shoulder - Left',
          referringDoctor: 'Dr. Orthopedic Surgeon',
          therapist: 'Dr. Anita Sharma',
          sessionNumber: 5,
          totalSessions: 18,
          date: selectedDate,
          time: '10:00',
          duration: 30,
          status: 'IN_PROGRESS',
          exercises: [
            { name: 'Pendulum exercises', sets: 2, reps: 20 },
            { name: 'Wall climbing', sets: 3, reps: 10 },
          ],
          painLevel: 6,
          mobilityScore: 4,
        },
        {
          id: '3',
          patientId: 'P003',
          patientName: 'Vikram Singh',
          patientMRN: 'MRN001236',
          patientAge: 65,
          diagnosis: 'Post-Stroke Hemiparesis - Right',
          referringDoctor: 'Dr. Neurologist',
          therapist: 'Dr. Priya Singh',
          sessionNumber: 15,
          totalSessions: 48,
          date: selectedDate,
          time: '11:00',
          duration: 60,
          status: 'SCHEDULED',
          exercises: [
            { name: 'ROM exercises', sets: 2, reps: 10 },
            { name: 'Balance training', sets: 3, reps: 5 },
            { name: 'Gait training', sets: 1, reps: 1, notes: '10 minutes' },
          ],
        },
        {
          id: '4',
          patientId: 'P004',
          patientName: 'Meera Reddy',
          patientMRN: 'MRN001237',
          patientAge: 35,
          diagnosis: 'Chronic Lower Back Pain',
          referringDoctor: 'Dr. Spine Specialist',
          therapist: 'Dr. Suresh Patel',
          sessionNumber: 3,
          totalSessions: 12,
          date: selectedDate,
          time: '14:00',
          duration: 45,
          status: 'SCHEDULED',
        },
      ]);
    } catch (error) {
      showToast('Failed to fetch sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (session: PhysiotherapySession) => {
    setSessions(prev => prev.map(s =>
      s.id === session.id ? { ...s, status: 'IN_PROGRESS' } : s
    ));
    showToast('Session started', 'success');
  };

  const handleCompleteSession = async () => {
    if (!selectedSession) return;

    setSessions(prev => prev.map(s =>
      s.id === selectedSession.id
        ? {
            ...s,
            status: 'COMPLETED',
            painLevel: progressData.painLevel,
            mobilityScore: progressData.mobilityScore,
            progressNotes: progressData.notes,
          }
        : s
    ));

    showToast('Session completed', 'success');
    setShowProgressDialog(false);
    setSelectedSession(null);
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch =
      s.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.patientMRN.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesTherapist = filterTherapist === 'all' || s.therapist === filterTherapist;
    return matchesSearch && matchesStatus && matchesTherapist;
  });

  const stats = {
    today: sessions.length,
    completed: sessions.filter(s => s.status === 'COMPLETED').length,
    inProgress: sessions.filter(s => s.status === 'IN_PROGRESS').length,
    scheduled: sessions.filter(s => s.status === 'SCHEDULED').length,
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      NO_SHOW: 'bg-slate-100 text-slate-800',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
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
          <h1 className="text-2xl font-bold text-slate-800">Physiotherapy</h1>
          <p className="text-slate-600">Rehabilitation and therapy sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSessions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowScheduleDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Today's Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Scheduled</p>
                <p className="text-2xl font-bold text-purple-600">{stats.scheduled}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="protocols">Treatment Protocols</TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search patient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[150px]"
                />
                <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Therapist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Therapists</SelectItem>
                    {THERAPISTS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{session.patientName}</h3>
                        <span className="text-sm text-slate-500">{session.patientMRN}</span>
                        {getStatusBadge(session.status)}
                        <Badge variant="outline">
                          Session {session.sessionNumber}/{session.totalSessions}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{session.diagnosis}</p>
                      <div className="flex gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {session.time} ({session.duration} min)
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {session.therapist}
                        </span>
                      </div>
                      {session.exercises && session.exercises.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {session.exercises.map((ex, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {ex.name}: {ex.sets}x{ex.reps}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {session.status === 'COMPLETED' && (
                        <div className="mt-2 p-2 bg-green-50 rounded flex gap-4 text-sm">
                          <span>Pain: {session.painLevel}/10</span>
                          <span>Mobility: {session.mobilityScore}/10</span>
                        </div>
                      )}
                      {session.progressNotes && (
                        <p className="text-sm text-slate-600 mt-2">
                          <strong>Notes:</strong> {session.progressNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {session.status === 'SCHEDULED' && (
                        <Button size="sm" onClick={() => handleStartSession(session)}>
                          Start Session
                        </Button>
                      )}
                      {session.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSession(session);
                            setShowProgressDialog(true);
                          }}
                        >
                          Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TREATMENT_PROTOCOLS.map((protocol) => (
              <Card key={protocol.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{protocol.name}</h3>
                    <Badge variant="outline">{protocol.sessions} sessions</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{protocol.condition}</p>
                  <p className="text-sm text-slate-500 mb-4">{protocol.description}</p>
                  <div>
                    <p className="text-sm font-medium mb-2">Exercises:</p>
                    <div className="flex flex-wrap gap-2">
                      {protocol.exercises.map((ex, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ex}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-sm text-slate-500">Duration: {protocol.duration}</span>
                    <Button size="sm" variant="outline">Use Protocol</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Session</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p>Session scheduling functionality coming soon.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Session</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedSession.patientName}</p>
                <p className="text-sm text-slate-600">{selectedSession.diagnosis}</p>
              </div>
              <div>
                <Label>Pain Level (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={progressData.painLevel}
                  onChange={(e) => setProgressData({ ...progressData, painLevel: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Mobility Score (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={progressData.mobilityScore}
                  onChange={(e) => setProgressData({ ...progressData, mobilityScore: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Progress Notes</Label>
                <Textarea
                  value={progressData.notes}
                  onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })}
                  placeholder="Document session progress..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgressDialog(false)}>Cancel</Button>
            <Button onClick={handleCompleteSession}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
