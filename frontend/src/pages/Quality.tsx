import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import api from '../services/api';

interface Incident {
  id: string;
  type: string;
  description: string;
  reportedBy: string;
  date: string;
  severity: string;
  status: string;
}

interface Feedback {
  id: string;
  patientName: string;
  department: string;
  rating: number;
  comments: string;
  date: string;
}

export default function Quality() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  useEffect(() => {
    fetchIncidents();
    fetchFeedbacks();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await api.get('/api/quality/incidents');
      setIncidents(response.data);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await api.get('/api/quality/feedbacks');
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    }
  };

  const pendingIncidents = incidents.filter(i => i.status === 'PENDING');
  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : '0';

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quality, Compliance & Feedback</h1>
          <p className="text-slate-600">Incident reporting, patient feedback, and quality metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Pending Incidents
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

      <Card>
        <CardHeader>
          <CardTitle>Quality Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="incidents">
            <TabsList>
              <TabsTrigger value="incidents">Incidents ({pendingIncidents.length})</TabsTrigger>
              <TabsTrigger value="feedback">Patient Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="incidents">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>{new Date(incident.date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline">{incident.type}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                      <TableCell>{incident.reportedBy}</TableCell>
                      <TableCell>
                        <Badge variant={incident.severity === 'HIGH' ? 'destructive' : incident.severity === 'MEDIUM' ? 'secondary' : 'outline'}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge>{incident.status}</Badge></TableCell>
                    </TableRow>
                  ))}
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
                  {feedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>{new Date(feedback.date).toLocaleDateString()}</TableCell>
                      <TableCell>{feedback.patientName}</TableCell>
                      <TableCell>{feedback.department}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{feedback.rating}/5</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{feedback.comments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
