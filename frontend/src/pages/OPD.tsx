import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Stethoscope } from 'lucide-react';

export default function OPD() {
  const [encounters] = useState([
    {
      id: '1',
      patientName: 'John Doe',
      doctorName: 'Dr. Sarah Smith',
      chiefComplaint: 'Fever and headache',
      status: 'In Progress',
      tokenNumber: 'T-001',
      time: '10:00 AM'
    }
  ]);

  const [soapNotes, setSoapNotes] = useState({
    subjective: '',
    objective: '',
    vitals: { bp: '', pulse: '', temp: '', weight: '', height: '' },
    assessment: '',
    plan: '',
    prescription: ''
  });

  const [isRadiologyDialogOpen, setIsRadiologyDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const radiologyTests = [
    { id: '1', name: 'X-Ray Chest', category: 'X-Ray' },
    { id: '2', name: 'CT Scan Brain', category: 'CT Scan' },
    { id: '3', name: 'MRI Spine', category: 'MRI' },
    { id: '4', name: 'Ultrasound Abdomen', category: 'Ultrasound' },
    { id: '5', name: 'X-Ray Knee', category: 'X-Ray' }
  ];

  const handleOrderRadiology = () => {
    if (selectedTests.length === 0) {
      alert('Please select at least one test');
      return;
    }
    // API call would go here
    console.log('Ordering radiology tests:', selectedTests);
    alert(`Successfully ordered ${selectedTests.length} radiology test(s)`);
    setSelectedTests([]);
    setIsRadiologyDialogOpen(false);
  };

  const handleScheduleFollowUp = () => {
    if (!followUpDate) {
      alert('Please select a follow-up date');
      return;
    }
    // API call would go here
    console.log('Scheduling follow-up:', { date: followUpDate, notes: followUpNotes });
    alert('Follow-up appointment scheduled successfully');
    setFollowUpDate('');
    setFollowUpNotes('');
    setIsFollowUpDialogOpen(false);
  };

  const toggleTest = (testId: string) => {
    setSelectedTests(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">OutPatient Department (OPD)</h1>
          <p className="text-slate-600">Manage OPD consultations and EMR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">25</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OPD Queue</CardTitle>
          <CardDescription>Patient consultation queue</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Chief Complaint</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encounters.map((encounter) => (
                <TableRow key={encounter.id}>
                  <TableCell className="font-medium">{encounter.tokenNumber}</TableCell>
                  <TableCell>{encounter.patientName}</TableCell>
                  <TableCell>{encounter.doctorName}</TableCell>
                  <TableCell>{encounter.chiefComplaint}</TableCell>
                  <TableCell>{encounter.time}</TableCell>
                  <TableCell>
                    <Badge variant={encounter.status === 'In Progress' ? 'default' : 'secondary'}>
                      {encounter.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Consult
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>OPD Consultation - {encounter.patientName}</DialogTitle>
                          <DialogDescription>Electronic Medical Record (EMR) - SOAP Notes</DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="vitals" className="w-full">
                          <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="vitals">Vitals</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="examination">Examination</TabsTrigger>
                            <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                            <TabsTrigger value="prescription">Prescription</TabsTrigger>
                          </TabsList>
                          <TabsContent value="vitals" className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Blood Pressure</Label>
                                <Input placeholder="120/80 mmHg" value={soapNotes.vitals.bp} onChange={(e) => setSoapNotes(prev => ({ ...prev, vitals: { ...prev.vitals, bp: e.target.value } }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Pulse Rate</Label>
                                <Input placeholder="72 bpm" value={soapNotes.vitals.pulse} onChange={(e) => setSoapNotes(prev => ({ ...prev, vitals: { ...prev.vitals, pulse: e.target.value } }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Temperature</Label>
                                <Input placeholder="98.6 °F" value={soapNotes.vitals.temp} onChange={(e) => setSoapNotes(prev => ({ ...prev, vitals: { ...prev.vitals, temp: e.target.value } }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Weight</Label>
                                <Input placeholder="70 kg" value={soapNotes.vitals.weight} onChange={(e) => setSoapNotes(prev => ({ ...prev, vitals: { ...prev.vitals, weight: e.target.value } }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Height</Label>
                                <Input placeholder="170 cm" value={soapNotes.vitals.height} onChange={(e) => setSoapNotes(prev => ({ ...prev, vitals: { ...prev.vitals, height: e.target.value } }))} />
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="history" className="space-y-4">
                            <div className="space-y-2">
                              <Label>Subjective (Chief Complaints, History)</Label>
                              <textarea className="w-full h-32 p-2 border rounded-md" placeholder="Enter patient's complaints and history..." value={soapNotes.subjective} onChange={(e) => setSoapNotes(prev => ({ ...prev, subjective: e.target.value }))} />
                            </div>
                          </TabsContent>
                          <TabsContent value="examination" className="space-y-4">
                            <div className="space-y-2">
                              <Label>Objective (Physical Examination Findings)</Label>
                              <textarea className="w-full h-32 p-2 border rounded-md" placeholder="Enter examination findings..." value={soapNotes.objective} onChange={(e) => setSoapNotes(prev => ({ ...prev, objective: e.target.value }))} />
                            </div>
                          </TabsContent>
                          <TabsContent value="diagnosis" className="space-y-4">
                            <div className="space-y-2">
                              <Label>Assessment (Diagnosis & ICD-10 Codes)</Label>
                              <textarea className="w-full h-32 p-2 border rounded-md" placeholder="Enter diagnosis and assessment..." value={soapNotes.assessment} onChange={(e) => setSoapNotes(prev => ({ ...prev, assessment: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Plan (Treatment Plan)</Label>
                              <textarea className="w-full h-32 p-2 border rounded-md" placeholder="Enter treatment plan..." value={soapNotes.plan} onChange={(e) => setSoapNotes(prev => ({ ...prev, plan: e.target.value }))} />
                            </div>
                          </TabsContent>
                          <TabsContent value="prescription" className="space-y-4">
                            <div className="space-y-2">
                              <Label>e-Prescription</Label>
                              <textarea className="w-full h-48 p-2 border rounded-md" placeholder="Enter medications with dosage, frequency, and duration..." value={soapNotes.prescription} onChange={(e) => setSoapNotes(prev => ({ ...prev, prescription: e.target.value }))} />
                            </div>
                            <div className="flex gap-2">
                              <Button>Order Lab Tests</Button>
                              <Button variant="outline" onClick={() => setIsRadiologyDialogOpen(true)}>Order Radiology</Button>
                              <Button variant="outline" onClick={() => setIsFollowUpDialogOpen(true)}>Schedule Follow-up</Button>
                            </div>
                          </TabsContent>
                        </Tabs>
                        <DialogFooter>
                          <Button variant="outline">Save Draft</Button>
                          <Button>Complete & Print</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Radiology Dialog */}
      <Dialog open={isRadiologyDialogOpen} onOpenChange={setIsRadiologyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Radiology Tests</DialogTitle>
            <DialogDescription>Select radiology investigations for the patient</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {radiologyTests.map((test) => (
                <div key={test.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => toggleTest(test.id)}>
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(test.id)}
                    onChange={() => toggleTest(test.id)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-xs text-slate-500">{test.category}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium">Selected: {selectedTests.length} test(s)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRadiologyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOrderRadiology}>Order Tests</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-up Dialog */}
      <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up Appointment</DialogTitle>
            <DialogDescription>Set next appointment date for the patient</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-date">Follow-up Date</Label>
              <Input
                id="followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-notes">Notes (Optional)</Label>
              <textarea
                id="followup-notes"
                className="w-full p-2 border rounded-md"
                rows={3}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Special instructions or reason for follow-up..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleFollowUp}>Schedule Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
