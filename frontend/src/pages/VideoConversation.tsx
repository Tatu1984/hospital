import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor,
  MessageSquare, Users, Calendar, Clock, User, Send,
  Maximize2, Minimize2, Settings, FileText, Pill, Camera
} from 'lucide-react';

interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  doctorId: string;
  doctorName: string;
  department: string;
  scheduledTime: string;
  status: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  duration?: number;
  chiefComplaint: string;
  notes?: string;
  prescription?: string;
  followUp?: string;
}

interface ChatMessage {
  id: string;
  sender: 'patient' | 'doctor' | 'system';
  message: string;
  timestamp: string;
}

export default function VideoConversation() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState('schedule');
  const [consultations, setConsultations] = useState<Consultation[]>([
    {
      id: 'VC001',
      patientId: 'P1001',
      patientName: 'Rahul Sharma',
      patientAge: 35,
      patientGender: 'Male',
      doctorId: 'D001',
      doctorName: 'Dr. Priya Mehta',
      department: 'General Medicine',
      scheduledTime: '2024-01-15T10:00:00',
      status: 'scheduled',
      chiefComplaint: 'Fever and body ache for 3 days'
    },
    {
      id: 'VC002',
      patientId: 'P1002',
      patientName: 'Anita Gupta',
      patientAge: 45,
      patientGender: 'Female',
      doctorId: 'D002',
      doctorName: 'Dr. Rajesh Kumar',
      department: 'Cardiology',
      scheduledTime: '2024-01-15T10:30:00',
      status: 'waiting',
      chiefComplaint: 'Chest discomfort and shortness of breath'
    },
    {
      id: 'VC003',
      patientId: 'P1003',
      patientName: 'Sanjay Patel',
      patientAge: 28,
      patientGender: 'Male',
      doctorId: 'D001',
      doctorName: 'Dr. Priya Mehta',
      department: 'General Medicine',
      scheduledTime: '2024-01-15T09:00:00',
      status: 'completed',
      duration: 15,
      chiefComplaint: 'Skin rash on arms',
      notes: 'Allergic dermatitis diagnosed',
      prescription: 'Cetirizine 10mg OD, Calamine lotion'
    }
  ]);

  const [isInCall, setIsInCall] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [newConsultation, setNewConsultation] = useState({
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    department: '',
    scheduledDate: '',
    scheduledTime: '',
    chiefComplaint: ''
  });

  const [prescription, setPrescription] = useState({
    diagnosis: '',
    medications: '',
    instructions: '',
    followUp: ''
  });

  const stats = {
    scheduled: consultations.filter(c => c.status === 'scheduled').length,
    waiting: consultations.filter(c => c.status === 'waiting').length,
    completed: consultations.filter(c => c.status === 'completed').length,
    cancelled: consultations.filter(c => ['cancelled', 'no-show'].includes(c.status)).length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'waiting': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800'
    };
    return <Badge className={styles[status]}>{status.replace('-', ' ').toUpperCase()}</Badge>;
  };

  const startCall = async (consultation: Consultation) => {
    try {
      // Request media permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setActiveConsultation(consultation);
      setIsInCall(true);
      setConsultations(prev => prev.map(c =>
        c.id === consultation.id ? { ...c, status: 'in-progress' } : c
      ));

      // Add system message
      setChatMessages([{
        id: Date.now().toString(),
        sender: 'system',
        message: 'Video consultation started',
        timestamp: new Date().toISOString()
      }]);

      toastSuccess('Call Started', `Connected with ${consultation.patientName}`);
    } catch (error) {
      toastError('Error', 'Failed to access camera/microphone');
    }
  };

  const endCall = () => {
    // Stop all tracks
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }

    if (activeConsultation) {
      setConsultations(prev => prev.map(c =>
        c.id === activeConsultation.id ? { ...c, status: 'completed', duration: 15 } : c
      ));
    }

    setIsInCall(false);
    setActiveConsultation(null);
    setVideoEnabled(true);
    setAudioEnabled(true);
    setIsScreenSharing(false);
    setChatMessages([]);
    setShowChat(false);

    toastSuccess('Call Ended', 'Consultation completed');
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => track.enabled = !videoEnabled);
    }
    setVideoEnabled(!videoEnabled);
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => track.enabled = !audioEnabled);
    }
    setAudioEnabled(!audioEnabled);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        // Would normally send this to peer connection
        setIsScreenSharing(true);
        toastSuccess('Screen Sharing', 'Screen sharing started');
      } catch (error) {
        toastError('Error', 'Failed to share screen');
      }
    } else {
      setIsScreenSharing(false);
      toastSuccess('Screen Sharing', 'Screen sharing stopped');
    }
  };

  const sendChatMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: 'doctor',
      message: newMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate patient response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'patient',
        message: 'Ok doctor, understood.',
        timestamp: new Date().toISOString()
      }]);
    }, 2000);
  };

  const scheduleConsultation = () => {
    const consultation: Consultation = {
      id: `VC${String(consultations.length + 1).padStart(3, '0')}`,
      patientId: newConsultation.patientId,
      patientName: newConsultation.patientName,
      patientAge: 30,
      patientGender: 'Male',
      doctorId: newConsultation.doctorId,
      doctorName: newConsultation.doctorName,
      department: newConsultation.department,
      scheduledTime: `${newConsultation.scheduledDate}T${newConsultation.scheduledTime}:00`,
      status: 'scheduled',
      chiefComplaint: newConsultation.chiefComplaint
    };

    setConsultations(prev => [...prev, consultation]);
    setShowScheduleDialog(false);
    setNewConsultation({
      patientId: '', patientName: '', doctorId: '', doctorName: '',
      department: '', scheduledDate: '', scheduledTime: '', chiefComplaint: ''
    });

    toastSuccess('Scheduled', 'Video consultation scheduled successfully');
  };

  const savePrescription = () => {
    if (activeConsultation) {
      setConsultations(prev => prev.map(c =>
        c.id === activeConsultation.id ? {
          ...c,
          notes: prescription.diagnosis,
          prescription: prescription.medications,
          followUp: prescription.followUp
        } : c
      ));
    }

    setShowPrescriptionDialog(false);
    setPrescription({ diagnosis: '', medications: '', instructions: '', followUp: '' });
    toastSuccess('Saved', 'Prescription saved successfully');
  };

  // Video Call Interface
  if (isInCall && activeConsultation) {
    return (
      <div className={`bg-gray-900 ${isFullScreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-100px)]'} flex`}>
        {/* Main Video Area */}
        <div className="flex-1 relative">
          {/* Remote Video (Patient) */}
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Placeholder when no remote stream */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <User className="h-24 w-24 mx-auto mb-4 opacity-50" />
                <p className="text-xl">{activeConsultation.patientName}</p>
                <p className="text-gray-400">Connecting...</p>
              </div>
            </div>
          </div>

          {/* Local Video (Doctor) - Picture in Picture */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-gray-500" />
              </div>
            )}
          </div>

          {/* Patient Info Overlay */}
          <div className="absolute top-4 left-4 bg-black/50 text-white p-3 rounded-lg">
            <p className="font-semibold">{activeConsultation.patientName}</p>
            <p className="text-sm text-gray-300">
              {activeConsultation.patientAge}y / {activeConsultation.patientGender}
            </p>
            <p className="text-sm text-gray-300">{activeConsultation.chiefComplaint}</p>
          </div>

          {/* Call Duration */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>15:32</span>
          </div>

          {/* Control Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-6 py-3 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${!audioEnabled ? 'bg-red-500 text-white' : 'text-white hover:bg-white/20'}`}
              onClick={toggleAudio}
            >
              {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${!videoEnabled ? 'bg-red-500 text-white' : 'text-white hover:bg-white/20'}`}
              onClick={toggleVideo}
            >
              {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${isScreenSharing ? 'bg-blue-500 text-white' : 'text-white hover:bg-white/20'}`}
              onClick={toggleScreenShare}
            >
              <Monitor className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/20"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>

            <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/20">
                  <Pill className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Write Prescription</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Diagnosis</Label>
                    <Textarea
                      value={prescription.diagnosis}
                      onChange={(e) => setPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
                      placeholder="Enter diagnosis..."
                    />
                  </div>
                  <div>
                    <Label>Medications</Label>
                    <Textarea
                      value={prescription.medications}
                      onChange={(e) => setPrescription(prev => ({ ...prev, medications: e.target.value }))}
                      placeholder="Enter medications..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Instructions</Label>
                    <Textarea
                      value={prescription.instructions}
                      onChange={(e) => setPrescription(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Special instructions..."
                    />
                  </div>
                  <div>
                    <Label>Follow-up</Label>
                    <Input
                      type="date"
                      value={prescription.followUp}
                      onChange={(e) => setPrescription(prev => ({ ...prev, followUp: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={savePrescription}>Save Prescription</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/20"
              onClick={() => setIsFullScreen(!isFullScreen)}
            >
              {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="rounded-full"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-white flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Chat</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`${
                    msg.sender === 'doctor'
                      ? 'ml-auto bg-blue-500 text-white'
                      : msg.sender === 'patient'
                      ? 'mr-auto bg-gray-100'
                      : 'mx-auto bg-yellow-100 text-yellow-800 text-sm'
                  } rounded-lg p-2 max-w-[80%]`}
                >
                  <p>{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'doctor' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              />
              <Button size="icon" onClick={sendChatMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Video Consultation</h1>
          <p className="text-gray-600">Telemedicine and virtual consultations</p>
        </div>
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Consultation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Video Consultation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient ID</Label>
                  <Input
                    value={newConsultation.patientId}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, patientId: e.target.value }))}
                    placeholder="P1001"
                  />
                </div>
                <div>
                  <Label>Patient Name</Label>
                  <Input
                    value={newConsultation.patientName}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Patient name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Doctor</Label>
                  <Select
                    value={newConsultation.doctorId}
                    onValueChange={(v) => setNewConsultation(prev => ({
                      ...prev,
                      doctorId: v,
                      doctorName: v === 'D001' ? 'Dr. Priya Mehta' : 'Dr. Rajesh Kumar'
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D001">Dr. Priya Mehta</SelectItem>
                      <SelectItem value="D002">Dr. Rajesh Kumar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select
                    value={newConsultation.department}
                    onValueChange={(v) => setNewConsultation(prev => ({ ...prev, department: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Medicine">General Medicine</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newConsultation.scheduledDate}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newConsultation.scheduledTime}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Chief Complaint</Label>
                <Textarea
                  value={newConsultation.chiefComplaint}
                  onChange={(e) => setNewConsultation(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  placeholder="Reason for consultation..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
              <Button onClick={scheduleConsultation}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-sm text-gray-600">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.waiting}</p>
                <p className="text-sm text-gray-600">Waiting</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Video className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <PhoneOff className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-sm text-gray-600">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedule">Today's Schedule</TabsTrigger>
          <TabsTrigger value="waiting">Waiting Room</TabsTrigger>
          <TabsTrigger value="history">Consultation History</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Video Consultations</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Patient</th>
                    <th className="text-left p-2">Doctor</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Complaint</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.filter(c => c.status !== 'completed').map((consultation) => (
                    <tr key={consultation.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {new Date(consultation.scheduledTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{consultation.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {consultation.patientAge}y / {consultation.patientGender}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">{consultation.doctorName}</td>
                      <td className="p-2">{consultation.department}</td>
                      <td className="p-2 max-w-xs truncate">{consultation.chiefComplaint}</td>
                      <td className="p-2">{getStatusBadge(consultation.status)}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          {consultation.status === 'waiting' && (
                            <Button size="sm" onClick={() => startCall(consultation)}>
                              <Phone className="h-4 w-4 mr-1" />
                              Join
                            </Button>
                          )}
                          {consultation.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setConsultations(prev => prev.map(c =>
                                  c.id === consultation.id ? { ...c, status: 'waiting' } : c
                                ));
                                toastSuccess('Notified', 'Patient has been notified');
                              }}
                            >
                              Notify Patient
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waiting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Waiting Room</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {consultations.filter(c => c.status === 'waiting').map((consultation) => (
                  <Card key={consultation.id} className="border-2 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold">{consultation.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {consultation.patientAge}y / {consultation.patientGender}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{consultation.chiefComplaint}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-yellow-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting 5 min
                        </Badge>
                        <Button size="sm" onClick={() => startCall(consultation)}>
                          <Video className="h-4 w-4 mr-1" />
                          Start Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {consultations.filter(c => c.status === 'waiting').length === 0 && (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No patients waiting</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultation History</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date/Time</th>
                    <th className="text-left p-2">Patient</th>
                    <th className="text-left p-2">Doctor</th>
                    <th className="text-left p-2">Duration</th>
                    <th className="text-left p-2">Diagnosis</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.filter(c => c.status === 'completed').map((consultation) => (
                    <tr key={consultation.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {new Date(consultation.scheduledTime).toLocaleString()}
                      </td>
                      <td className="p-2">{consultation.patientName}</td>
                      <td className="p-2">{consultation.doctorName}</td>
                      <td className="p-2">{consultation.duration} min</td>
                      <td className="p-2">{consultation.notes || '-'}</td>
                      <td className="p-2">{getStatusBadge(consultation.status)}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
