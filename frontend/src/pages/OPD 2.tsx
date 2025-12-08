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
                              <Button variant="outline">Order Radiology</Button>
                              <Button variant="outline">Schedule Follow-up</Button>
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
    </div>
  );
}
