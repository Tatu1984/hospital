import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/Toast';
import {
  Image, Search, Download, Share2, Printer, ZoomIn, ZoomOut,
  RotateCw, Ruler, Move, Contrast, Grid, Layers, Monitor,
  HardDrive, Cloud, Upload, Eye, FileImage, Server, Activity
} from 'lucide-react';

interface DicomStudy {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  accessionNumber: string;
  studyDate: string;
  modality: string;
  description: string;
  bodyPart: string;
  seriesCount: number;
  imageCount: number;
  status: 'pending' | 'received' | 'viewing' | 'reported' | 'archived';
  reportingDoctor?: string;
  reportStatus?: 'pending' | 'draft' | 'final';
  fileSize: string;
  source: 'local' | 'cloud' | 'external';
}

interface WorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  scheduledDate: string;
  modality: string;
  procedure: string;
  referringDoctor: string;
  status: 'scheduled' | 'arrived' | 'in-progress' | 'completed';
}

export default function DICOMPACS() {
  const { success: toastSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('studies');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const [studies, setStudies] = useState<DicomStudy[]>([
    {
      id: 'STU001',
      patientId: 'P1001',
      patientName: 'Rahul Sharma',
      patientAge: 45,
      patientGender: 'M',
      accessionNumber: 'ACC2024001',
      studyDate: '2024-01-15',
      modality: 'CT',
      description: 'CT Chest with Contrast',
      bodyPart: 'CHEST',
      seriesCount: 3,
      imageCount: 245,
      status: 'received',
      fileSize: '125 MB',
      source: 'local'
    },
    {
      id: 'STU002',
      patientId: 'P1002',
      patientName: 'Priya Patel',
      patientAge: 32,
      patientGender: 'F',
      accessionNumber: 'ACC2024002',
      studyDate: '2024-01-15',
      modality: 'MRI',
      description: 'MRI Brain Plain',
      bodyPart: 'HEAD',
      seriesCount: 5,
      imageCount: 180,
      status: 'reported',
      reportingDoctor: 'Dr. Kumar',
      reportStatus: 'final',
      fileSize: '210 MB',
      source: 'local'
    },
    {
      id: 'STU003',
      patientId: 'P1003',
      patientName: 'Amit Singh',
      patientAge: 55,
      patientGender: 'M',
      accessionNumber: 'ACC2024003',
      studyDate: '2024-01-15',
      modality: 'X-RAY',
      description: 'Chest PA View',
      bodyPart: 'CHEST',
      seriesCount: 1,
      imageCount: 2,
      status: 'pending',
      fileSize: '8 MB',
      source: 'local'
    },
    {
      id: 'STU004',
      patientId: 'P1004',
      patientName: 'Neha Gupta',
      patientAge: 28,
      patientGender: 'F',
      accessionNumber: 'ACC2024004',
      studyDate: '2024-01-14',
      modality: 'USG',
      description: 'USG Abdomen',
      bodyPart: 'ABDOMEN',
      seriesCount: 2,
      imageCount: 45,
      status: 'reported',
      reportingDoctor: 'Dr. Mehta',
      reportStatus: 'final',
      fileSize: '35 MB',
      source: 'local'
    },
    {
      id: 'STU005',
      patientId: 'P1005',
      patientName: 'Suresh Kumar',
      patientAge: 60,
      patientGender: 'M',
      accessionNumber: 'ACC2024005',
      studyDate: '2024-01-15',
      modality: 'CT',
      description: 'CT Abdomen Pelvis',
      bodyPart: 'ABDOMEN',
      seriesCount: 4,
      imageCount: 320,
      status: 'viewing',
      reportingDoctor: 'Dr. Verma',
      reportStatus: 'draft',
      fileSize: '185 MB',
      source: 'cloud'
    }
  ]);

  const [worklist, setWorklist] = useState<WorklistItem[]>([
    {
      id: 'WL001',
      patientId: 'P1006',
      patientName: 'Ravi Krishnan',
      scheduledDate: '2024-01-15T10:00:00',
      modality: 'CT',
      procedure: 'CT Brain Plain',
      referringDoctor: 'Dr. Shah',
      status: 'scheduled'
    },
    {
      id: 'WL002',
      patientId: 'P1007',
      patientName: 'Anita Desai',
      scheduledDate: '2024-01-15T10:30:00',
      modality: 'MRI',
      procedure: 'MRI Spine Lumbar',
      referringDoctor: 'Dr. Patel',
      status: 'arrived'
    },
    {
      id: 'WL003',
      patientId: 'P1008',
      patientName: 'Mohan Lal',
      scheduledDate: '2024-01-15T11:00:00',
      modality: 'X-RAY',
      procedure: 'X-Ray Knee Both Views',
      referringDoctor: 'Dr. Kumar',
      status: 'in-progress'
    }
  ]);

  // Viewer state
  const [zoom, setZoom] = useState(100);
  const [windowLevel, _setWindowLevel] = useState({ window: 400, level: 40 });
  const [currentSeries, setCurrentSeries] = useState(1);
  const [currentImage, setCurrentImage] = useState(1);

  const stats = {
    total: studies.length,
    pending: studies.filter(s => s.status === 'pending').length,
    reported: studies.filter(s => s.status === 'reported').length,
    storage: '2.5 TB'
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'received': 'bg-blue-100 text-blue-800',
      'viewing': 'bg-purple-100 text-purple-800',
      'reported': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800',
      'scheduled': 'bg-blue-100 text-blue-800',
      'arrived': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return <Badge className={styles[status]}>{status.toUpperCase()}</Badge>;
  };

  const getModalityIcon = (modality: string) => {
    const icons: Record<string, string> = {
      'CT': '🔬',
      'MRI': '🧲',
      'X-RAY': '☢️',
      'USG': '📡',
      'PET': '⚛️',
      'MAMMO': '🩺'
    };
    return icons[modality] || '📷';
  };

  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.accessionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModality = modalityFilter === 'all' || study.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  const openViewer = (study: DicomStudy) => {
    setSelectedStudy(study);
    setShowViewer(true);
    setStudies(prev => prev.map(s =>
      s.id === study.id ? { ...s, status: 'viewing' } : s
    ));
  };

  // DICOM Viewer Component
  if (showViewer && selectedStudy) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-900 border-b border-gray-700 p-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-white" onClick={() => setShowViewer(false)}>
              ← Back
            </Button>
            <div className="text-white">
              <span className="font-semibold">{selectedStudy.patientName}</span>
              <span className="text-gray-400 ml-2">{selectedStudy.patientId}</span>
              <span className="text-gray-400 ml-4">{selectedStudy.description}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Left Panel - Thumbnails */}
          <div className="w-48 bg-gray-900 border-r border-gray-700 overflow-auto p-2">
            <p className="text-gray-400 text-sm mb-2">Series ({selectedStudy.seriesCount})</p>
            {Array.from({ length: selectedStudy.seriesCount }).map((_, idx) => (
              <div
                key={idx}
                className={`mb-2 cursor-pointer rounded ${currentSeries === idx + 1 ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => { setCurrentSeries(idx + 1); setCurrentImage(1); }}
              >
                <div className="aspect-square bg-gray-800 rounded flex items-center justify-center">
                  <Image className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-white text-xs mt-1 text-center">Series {idx + 1}</p>
              </div>
            ))}
          </div>

          {/* Main Viewer */}
          <div className="flex-1 flex flex-col">
            {/* Tool Palette */}
            <div className="bg-gray-800 p-2 flex items-center gap-2 border-b border-gray-700">
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setZoom(z => Math.min(z + 10, 200))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setZoom(z => Math.max(z - 10, 50))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm">{zoom}%</span>
              <div className="w-px h-6 bg-gray-600 mx-2" />
              <Button variant="ghost" size="icon" className="text-white">
                <Move className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <Ruler className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <Contrast className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-600 mx-2" />
              <Button variant="ghost" size="icon" className="text-white">
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <Layers className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              <div className="text-gray-400 text-sm">
                W: {windowLevel.window} L: {windowLevel.level}
              </div>
            </div>

            {/* Image Display */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {/* Simulated DICOM Image */}
              <div
                className="bg-gray-800 rounded"
                style={{
                  width: `${zoom * 4}px`,
                  height: `${zoom * 4}px`,
                  maxWidth: '90%',
                  maxHeight: '90%'
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <FileImage className="h-16 w-16 mx-auto mb-2" />
                    <p>DICOM Image Preview</p>
                    <p className="text-sm">{selectedStudy.modality} - {selectedStudy.bodyPart}</p>
                    <p className="text-xs mt-2">Image {currentImage} of {Math.floor(selectedStudy.imageCount / selectedStudy.seriesCount)}</p>
                  </div>
                </div>
              </div>

              {/* Corner Annotations */}
              <div className="absolute top-4 left-4 text-green-400 text-xs font-mono">
                <p>{selectedStudy.patientName}</p>
                <p>{selectedStudy.patientId}</p>
                <p>{selectedStudy.patientAge}Y {selectedStudy.patientGender}</p>
              </div>
              <div className="absolute top-4 right-4 text-green-400 text-xs font-mono text-right">
                <p>{selectedStudy.studyDate}</p>
                <p>{selectedStudy.modality}</p>
                <p>Series {currentSeries}</p>
              </div>
              <div className="absolute bottom-4 left-4 text-green-400 text-xs font-mono">
                <p>W: {windowLevel.window}</p>
                <p>L: {windowLevel.level}</p>
                <p>Zoom: {zoom}%</p>
              </div>
              <div className="absolute bottom-4 right-4 text-green-400 text-xs font-mono text-right">
                <p>Image: {currentImage}/{Math.floor(selectedStudy.imageCount / selectedStudy.seriesCount)}</p>
                <p>{selectedStudy.description}</p>
              </div>
            </div>

            {/* Image Slider */}
            <div className="bg-gray-800 p-2 border-t border-gray-700">
              <input
                type="range"
                min="1"
                max={Math.floor(selectedStudy.imageCount / selectedStudy.seriesCount)}
                value={currentImage}
                onChange={(e) => setCurrentImage(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Right Panel - Info */}
          <div className="w-64 bg-gray-900 border-l border-gray-700 p-4 overflow-auto">
            <h3 className="text-white font-semibold mb-4">Study Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400">Patient Name</p>
                <p className="text-white">{selectedStudy.patientName}</p>
              </div>
              <div>
                <p className="text-gray-400">Patient ID</p>
                <p className="text-white">{selectedStudy.patientId}</p>
              </div>
              <div>
                <p className="text-gray-400">Accession #</p>
                <p className="text-white">{selectedStudy.accessionNumber}</p>
              </div>
              <div>
                <p className="text-gray-400">Study Date</p>
                <p className="text-white">{selectedStudy.studyDate}</p>
              </div>
              <div>
                <p className="text-gray-400">Modality</p>
                <p className="text-white">{selectedStudy.modality}</p>
              </div>
              <div>
                <p className="text-gray-400">Body Part</p>
                <p className="text-white">{selectedStudy.bodyPart}</p>
              </div>
              <div>
                <p className="text-gray-400">Description</p>
                <p className="text-white">{selectedStudy.description}</p>
              </div>
              <div>
                <p className="text-gray-400">Series/Images</p>
                <p className="text-white">{selectedStudy.seriesCount} / {selectedStudy.imageCount}</p>
              </div>
              <div>
                <p className="text-gray-400">File Size</p>
                <p className="text-white">{selectedStudy.fileSize}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button className="w-full" size="sm">
                Create Report
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Compare Study
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                3D Reconstruction
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">DICOM/PACS</h1>
          <p className="text-gray-600">Picture Archiving and Communication System</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import DICOM
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import DICOM Files</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Drag and drop DICOM files here</p>
                  <p className="text-sm text-gray-400 mt-2">or click to browse</p>
                  <input type="file" className="hidden" multiple accept=".dcm" />
                </div>
                <div>
                  <Label>Import from DICOM CD</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CD drive" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cd1">CD Drive (D:)</SelectItem>
                      <SelectItem value="cd2">DVD Drive (E:)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                <Button onClick={() => {
                  setShowUploadDialog(false);
                  toastSuccess('Import Started', 'DICOM files are being imported');
                }}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button>
            <Server className="h-4 w-4 mr-2" />
            Query/Retrieve
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Image className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Studies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Activity className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-600">Pending Report</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileImage className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.reported}</p>
                <p className="text-sm text-gray-600">Reported</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.storage}</p>
                <p className="text-sm text-gray-600">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="studies">Study List</TabsTrigger>
          <TabsTrigger value="worklist">Modality Worklist</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="settings">DICOM Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="studies" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by patient name, ID, or accession number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={modalityFilter} onValueChange={setModalityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modalities</SelectItem>
                    <SelectItem value="CT">CT</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="X-RAY">X-Ray</SelectItem>
                    <SelectItem value="USG">Ultrasound</SelectItem>
                    <SelectItem value="PET">PET</SelectItem>
                    <SelectItem value="MAMMO">Mammography</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Study List */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Patient</th>
                    <th className="text-left p-3">Accession #</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Modality</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Images</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudies.map((study) => (
                    <tr key={study.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{study.patientName}</p>
                          <p className="text-sm text-gray-500">{study.patientId} • {study.patientAge}Y {study.patientGender}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-sm">{study.accessionNumber}</td>
                      <td className="p-3">{study.studyDate}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {getModalityIcon(study.modality)} {study.modality}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>
                          <p>{study.description}</p>
                          <p className="text-sm text-gray-500">{study.bodyPart}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <p>{study.seriesCount} series</p>
                        <p className="text-sm text-gray-500">{study.imageCount} images</p>
                      </td>
                      <td className="p-3">{getStatusBadge(study.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => openViewer(study)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
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

        <TabsContent value="worklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modality Worklist</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Scheduled Time</th>
                    <th className="text-left p-3">Patient</th>
                    <th className="text-left p-3">Modality</th>
                    <th className="text-left p-3">Procedure</th>
                    <th className="text-left p-3">Referring Doctor</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {worklist.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(item.scheduledDate).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{item.patientName}</p>
                          <p className="text-sm text-gray-500">{item.patientId}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {getModalityIcon(item.modality)} {item.modality}
                        </Badge>
                      </td>
                      <td className="p-3">{item.procedure}</td>
                      <td className="p-3">{item.referringDoctor}</td>
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {item.status === 'arrived' && (
                            <Button size="sm" onClick={() => {
                              setWorklist(prev => prev.map(w =>
                                w.id === item.id ? { ...w, status: 'in-progress' } : w
                              ));
                            }}>
                              Start Exam
                            </Button>
                          )}
                          {item.status === 'in-progress' && (
                            <Button size="sm" variant="outline" onClick={() => {
                              setWorklist(prev => prev.map(w =>
                                w.id === item.id ? { ...w, status: 'completed' } : w
                              ));
                              toastSuccess('Completed', 'Exam completed successfully');
                            }}>
                              Complete
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

        <TabsContent value="storage" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Local Storage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Used: 2.5 TB</span>
                      <span>Total: 10 TB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>• Studies: 12,450</p>
                    <p>• Images: 3,245,000</p>
                    <p>• Available: 7.5 TB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Cloud Archive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Used: 15.2 TB</span>
                      <span>Total: Unlimited</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>• Archived Studies: 45,200</p>
                    <p>• Provider: AWS S3</p>
                    <p>• Status: Connected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Connected Modalities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span>CT Scanner 1</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span>MRI 1.5T</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span>X-Ray DR</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span>Ultrasound 1</span>
                    <Badge className="bg-red-100 text-red-800">Offline</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>DICOM Server Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>AE Title</Label>
                  <Input defaultValue="HOSPITAL_PACS" />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input defaultValue="4242" />
                </div>
                <div>
                  <Label>Storage Path</Label>
                  <Input defaultValue="/dicom/storage" />
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Remote PACS Nodes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="font-medium">CT_SCANNER_1</p>
                      <p className="text-sm text-gray-500">192.168.1.100:4242</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="font-medium">MRI_SCANNER</p>
                      <p className="text-sm text-gray-500">192.168.1.101:4242</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="font-medium">EXTERNAL_PACS</p>
                      <p className="text-sm text-gray-500">10.0.0.50:11112</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Add Remote Node
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
