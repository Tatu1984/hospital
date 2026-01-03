import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Wind, AlertTriangle, Play, Square, Settings,
  Stethoscope, AlertCircle, CheckCircle2, Timer
} from 'lucide-react';
import api from '../services/api';

// Ventilator mode definitions with clinical parameters
const VENTILATOR_MODES = {
  // Invasive Modes
  'CMV': {
    name: 'CMV - Controlled Mandatory Ventilation',
    category: 'invasive',
    description: 'Full ventilatory support, patient passive',
    params: ['fio2', 'peep', 'tidalVolume', 'respiratoryRate', 'ieRatio']
  },
  'AC': {
    name: 'A/C - Assist Control',
    category: 'invasive',
    description: 'Patient-triggered with guaranteed tidal volume',
    params: ['fio2', 'peep', 'tidalVolume', 'respiratoryRate', 'ieRatio', 'triggerSensitivity']
  },
  'SIMV': {
    name: 'SIMV - Synchronized Intermittent Mandatory Ventilation',
    category: 'invasive',
    description: 'Mandatory breaths synchronized with patient effort',
    params: ['fio2', 'peep', 'tidalVolume', 'respiratoryRate', 'pressureSupport', 'triggerSensitivity']
  },
  'PSV': {
    name: 'PSV - Pressure Support Ventilation',
    category: 'invasive',
    description: 'Patient-triggered, pressure-supported breaths',
    params: ['fio2', 'peep', 'pressureSupport', 'triggerSensitivity']
  },
  'PCV': {
    name: 'PCV - Pressure Control Ventilation',
    category: 'invasive',
    description: 'Pressure-targeted, time-cycled ventilation',
    params: ['fio2', 'peep', 'inspiratoryPressure', 'respiratoryRate', 'ieRatio', 'triggerSensitivity']
  },
  'PRVC': {
    name: 'PRVC - Pressure Regulated Volume Control',
    category: 'invasive',
    description: 'Adaptive pressure control targeting volume',
    params: ['fio2', 'peep', 'tidalVolume', 'respiratoryRate', 'ieRatio', 'pressureLimit']
  },
  'APRV': {
    name: 'APRV - Airway Pressure Release Ventilation',
    category: 'invasive',
    description: 'High CPAP with intermittent releases',
    params: ['fio2', 'pHigh', 'pLow', 'tHigh', 'tLow']
  },
  'HFV': {
    name: 'HFV - High Frequency Ventilation',
    category: 'invasive',
    description: 'Very high rate, very low tidal volume',
    params: ['fio2', 'meanAirwayPressure', 'amplitude', 'frequency']
  },
  // Non-Invasive Modes
  'CPAP': {
    name: 'CPAP - Continuous Positive Airway Pressure',
    category: 'non-invasive',
    description: 'Constant pressure throughout respiratory cycle',
    params: ['fio2', 'cpapPressure']
  },
  'BiPAP': {
    name: 'BiPAP - Bilevel Positive Airway Pressure',
    category: 'non-invasive',
    description: 'Two pressure levels for inspiration and expiration',
    params: ['fio2', 'ipap', 'epap', 'respiratoryRate', 'riseTime']
  },
  'NPPV': {
    name: 'NPPV - Non-invasive Positive Pressure Ventilation',
    category: 'non-invasive',
    description: 'Mask-delivered pressure support',
    params: ['fio2', 'ipap', 'epap', 'pressureSupport']
  },
  // Weaning Modes
  'T-PIECE': {
    name: 'T-Piece Trial',
    category: 'weaning',
    description: 'Spontaneous breathing trial',
    params: ['fio2', 'trialDuration']
  },
  'MINIMAL': {
    name: 'Minimal Support',
    category: 'weaning',
    description: 'Low pressure support for weaning',
    params: ['fio2', 'peep', 'pressureSupport']
  }
};

// Parameter definitions with ranges and units
const PARAM_DEFINITIONS: Record<string, {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  critical?: { low?: number; high?: number };
}> = {
  fio2: { label: 'FiO2', unit: '%', min: 21, max: 100, step: 1, default: 40, critical: { high: 60 } },
  peep: { label: 'PEEP', unit: 'cmH2O', min: 0, max: 24, step: 1, default: 5, critical: { high: 15 } },
  tidalVolume: { label: 'Tidal Volume', unit: 'mL', min: 200, max: 800, step: 10, default: 450 },
  respiratoryRate: { label: 'Respiratory Rate', unit: '/min', min: 8, max: 35, step: 1, default: 14 },
  ieRatio: { label: 'I:E Ratio', unit: '', min: 1, max: 4, step: 0.5, default: 2 },
  triggerSensitivity: { label: 'Trigger Sensitivity', unit: 'L/min', min: 0.5, max: 5, step: 0.5, default: 2 },
  pressureSupport: { label: 'Pressure Support', unit: 'cmH2O', min: 0, max: 30, step: 1, default: 10 },
  inspiratoryPressure: { label: 'Inspiratory Pressure', unit: 'cmH2O', min: 10, max: 40, step: 1, default: 20 },
  pressureLimit: { label: 'Pressure Limit', unit: 'cmH2O', min: 20, max: 50, step: 1, default: 35 },
  cpapPressure: { label: 'CPAP Pressure', unit: 'cmH2O', min: 4, max: 20, step: 1, default: 8 },
  ipap: { label: 'IPAP', unit: 'cmH2O', min: 8, max: 30, step: 1, default: 14 },
  epap: { label: 'EPAP', unit: 'cmH2O', min: 4, max: 20, step: 1, default: 6 },
  riseTime: { label: 'Rise Time', unit: 'ms', min: 50, max: 400, step: 50, default: 150 },
  pHigh: { label: 'P-High', unit: 'cmH2O', min: 20, max: 40, step: 1, default: 28 },
  pLow: { label: 'P-Low', unit: 'cmH2O', min: 0, max: 10, step: 1, default: 0 },
  tHigh: { label: 'T-High', unit: 'sec', min: 2, max: 8, step: 0.5, default: 4 },
  tLow: { label: 'T-Low', unit: 'sec', min: 0.2, max: 1, step: 0.1, default: 0.5 },
  meanAirwayPressure: { label: 'Mean Airway Pressure', unit: 'cmH2O', min: 10, max: 35, step: 1, default: 20 },
  amplitude: { label: 'Amplitude', unit: 'cmH2O', min: 10, max: 90, step: 5, default: 30 },
  frequency: { label: 'Frequency', unit: 'Hz', min: 3, max: 15, step: 1, default: 6 },
  trialDuration: { label: 'Trial Duration', unit: 'min', min: 30, max: 120, step: 15, default: 30 }
};

interface VentilationManagementProps {
  admissionId: string;
  patientName: string;
  patientId: string;
  currentVentilation?: {
    isVentilated: boolean;
    ventilatorMode?: string;
    ventilationStartDate?: string;
    ventilatorSettings?: any;
  };
  onUpdate?: () => void;
  compact?: boolean;
}

interface VentilatorSettings {
  [key: string]: number;
}

export default function VentilationManagement({
  admissionId,
  patientName,
  patientId: _patientId,
  currentVentilation,
  onUpdate,
  compact = false
}: VentilationManagementProps) {
  // patientId available for future use (e.g., patient-specific ventilator history)
  void _patientId;
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for starting ventilation
  const [selectedMode, setSelectedMode] = useState<string>('SIMV');
  const [settings, setSettings] = useState<VentilatorSettings>({});
  const [ventilationType, setVentilationType] = useState<'invasive' | 'non-invasive'>('invasive');
  const [intubationType, setIntubationType] = useState<string>('ETT');
  const [ettSize, setEttSize] = useState<string>('7.5');
  const [ettDepth, setEttDepth] = useState<string>('22');
  const [notes, setNotes] = useState<string>('');

  // Weaning assessment
  const [weaningCriteria, setWeaningCriteria] = useState({
    rsbi: '',
    nif: '',
    mvc: '',
    abgSatisfactory: false,
    hemodynamicallyStable: false,
    adequateCough: false,
    minimalSecretions: false,
    alertAndCooperative: false
  });

  // Stop reason
  const [stopReason, setStopReason] = useState<string>('weaned');
  const [stopNotes, setStopNotes] = useState<string>('');

  // Initialize settings when mode changes
  useEffect(() => {
    const modeConfig = VENTILATOR_MODES[selectedMode as keyof typeof VENTILATOR_MODES];
    if (modeConfig) {
      const newSettings: VentilatorSettings = {};
      modeConfig.params.forEach(param => {
        const paramDef = PARAM_DEFINITIONS[param];
        if (paramDef) {
          newSettings[param] = paramDef.default;
        }
      });
      setSettings(newSettings);
    }
  }, [selectedMode]);

  // Calculate ventilation duration
  const getVentilationDuration = () => {
    if (!currentVentilation?.ventilationStartDate) return null;
    const start = new Date(currentVentilation.ventilationStartDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  const handleStartVentilation = async () => {
    console.log('[Ventilation] Starting ventilation for admission:', admissionId);

    if (!admissionId) {
      console.error('[Ventilation] ERROR: admissionId is undefined!');
      setError('Cannot start ventilation: No admission ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ventilatorMode: selectedMode,
        ventilatorSettings: {
          ...settings,
          ventilationType,
          intubationType: ventilationType === 'invasive' ? intubationType : null,
          ettSize: ventilationType === 'invasive' && intubationType === 'ETT' ? ettSize : null,
          ettDepth: ventilationType === 'invasive' && intubationType === 'ETT' ? ettDepth : null,
          notes
        }
      };

      console.log('[Ventilation] Sending payload:', payload);
      console.log('[Ventilation] API URL:', `/api/admissions/${admissionId}/ventilation`);

      const response = await api.post(`/api/admissions/${admissionId}/ventilation`, payload);
      console.log('[Ventilation] Success response:', response.data);

      setIsStartDialogOpen(false);
      onUpdate?.();
    } catch (err: any) {
      console.error('[Ventilation] ERROR:', err);
      console.error('[Ventilation] Error response:', err.response?.data);
      console.error('[Ventilation] Error status:', err.response?.status);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start ventilation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/api/admissions/${admissionId}/ventilation`, {
        ventilatorMode: selectedMode,
        ventilatorSettings: settings
      });
      setIsSettingsDialogOpen(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleStopVentilation = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/api/admissions/${admissionId}/ventilation`, {
        data: { reason: stopReason, notes: stopNotes, weaningCriteria }
      });
      setIsStopDialogOpen(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to stop ventilation');
    } finally {
      setLoading(false);
    }
  };

  const renderParameterInput = (paramKey: string) => {
    const param = PARAM_DEFINITIONS[paramKey];
    if (!param) return null;

    const value = settings[paramKey] ?? param.default;
    const isCritical = param.critical &&
      ((param.critical.low && value < param.critical.low) ||
       (param.critical.high && value > param.critical.high));

    return (
      <div key={paramKey} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {param.label}
            {isCritical && <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />}
          </Label>
          <span className={`text-sm font-mono ${isCritical ? 'text-orange-600 font-bold' : 'text-gray-600'}`}>
            {value} {param.unit}
          </span>
        </div>
        <Slider
          value={[value]}
          min={param.min}
          max={param.max}
          step={param.step}
          onValueChange={(val) => setSettings({ ...settings, [paramKey]: val[0] })}
          className={isCritical ? 'accent-orange-500' : ''}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{param.min}</span>
          <span>{param.max}</span>
        </div>
      </div>
    );
  };

  // Compact view for bed cards
  if (compact) {
    if (!currentVentilation?.isVentilated) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsStartDialogOpen(true)}
          className="text-xs"
        >
          <Wind className="h-3 w-3 mr-1" />
          Ventilate
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-red-500 text-white animate-pulse">
          <Wind className="h-3 w-3 mr-1" />
          {currentVentilation.ventilatorMode}
        </Badge>
        <span className="text-xs text-gray-500">{getVentilationDuration()}</span>
      </div>
    );
  }

  // Full view
  return (
    <>
      {/* Current Status Card */}
      <Card className={currentVentilation?.isVentilated ? 'border-red-300 bg-red-50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className={`h-4 w-4 ${currentVentilation?.isVentilated ? 'text-red-600' : 'text-gray-400'}`} />
              Ventilation Status
            </div>
            {currentVentilation?.isVentilated ? (
              <Badge className="bg-red-500 text-white">ON VENTILATOR</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">Not Ventilated</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentVentilation?.isVentilated ? (
            <div className="space-y-4">
              {/* Current Settings Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-500">Mode</div>
                  <div className="font-bold text-lg">{currentVentilation.ventilatorMode}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="font-bold text-lg flex items-center">
                    <Timer className="h-4 w-4 mr-1 text-blue-500" />
                    {getVentilationDuration()}
                  </div>
                </div>
                {currentVentilation.ventilatorSettings?.fio2 && (
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-gray-500">FiO2</div>
                    <div className={`font-bold text-lg ${currentVentilation.ventilatorSettings.fio2 > 60 ? 'text-orange-600' : ''}`}>
                      {currentVentilation.ventilatorSettings.fio2}%
                    </div>
                  </div>
                )}
                {currentVentilation.ventilatorSettings?.peep && (
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-gray-500">PEEP</div>
                    <div className={`font-bold text-lg ${currentVentilation.ventilatorSettings.peep > 15 ? 'text-orange-600' : ''}`}>
                      {currentVentilation.ventilatorSettings.peep} cmH2O
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Settings */}
              {currentVentilation.ventilatorSettings && (
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-500 mb-2">Current Parameters</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {Object.entries(currentVentilation.ventilatorSettings)
                      .filter(([key]) => PARAM_DEFINITIONS[key])
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500">{PARAM_DEFINITIONS[key].label}:</span>
                          <span className="font-medium">{value as number} {PARAM_DEFINITIONS[key].unit}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMode(currentVentilation.ventilatorMode || 'SIMV');
                    setSettings(currentVentilation.ventilatorSettings || {});
                    setIsSettingsDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Adjust Settings
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsStopDialogOpen(true)}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop Ventilation
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Wind className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Patient is not currently on ventilatory support</p>
              <Button onClick={() => {
                console.log('[Ventilation] Opening start dialog, admissionId:', admissionId);
                setIsStartDialogOpen(true);
              }}>
                <Play className="h-4 w-4 mr-2" />
                Start Ventilation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Ventilation Dialog */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-blue-600" />
              Start Mechanical Ventilation - {patientName}
            </DialogTitle>
            <DialogDescription>
              Configure ventilator mode and parameters for the patient
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Tabs defaultValue="mode" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="mode">Mode Selection</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="airway">Airway</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="mode" className="space-y-4 mt-4">
              {/* Ventilation Type Toggle */}
              <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Button
                  variant={ventilationType === 'invasive' ? 'default' : 'outline'}
                  onClick={() => {
                    setVentilationType('invasive');
                    setSelectedMode('SIMV');
                  }}
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Invasive Ventilation
                </Button>
                <Button
                  variant={ventilationType === 'non-invasive' ? 'default' : 'outline'}
                  onClick={() => {
                    setVentilationType('non-invasive');
                    setSelectedMode('BiPAP');
                  }}
                >
                  <Wind className="h-4 w-4 mr-2" />
                  Non-Invasive (NIV)
                </Button>
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(VENTILATOR_MODES)
                  .filter(([, mode]) =>
                    ventilationType === 'invasive'
                      ? mode.category === 'invasive' || mode.category === 'weaning'
                      : mode.category === 'non-invasive'
                  )
                  .map(([key, mode]) => (
                    <div
                      key={key}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedMode === key
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedMode(key)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{key}</span>
                        {selectedMode === key && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="text-sm text-gray-600">{mode.name.split(' - ')[1]}</div>
                      <div className="text-xs text-gray-400 mt-1">{mode.description}</div>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="parameters" className="space-y-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <div className="font-semibold text-blue-800">
                  {VENTILATOR_MODES[selectedMode as keyof typeof VENTILATOR_MODES]?.name}
                </div>
                <div className="text-sm text-blue-600">
                  {VENTILATOR_MODES[selectedMode as keyof typeof VENTILATOR_MODES]?.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {VENTILATOR_MODES[selectedMode as keyof typeof VENTILATOR_MODES]?.params.map(param =>
                  renderParameterInput(param)
                )}
              </div>
            </TabsContent>

            <TabsContent value="airway" className="space-y-4 mt-4">
              {ventilationType === 'invasive' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Airway Type</Label>
                      <Select value={intubationType} onValueChange={setIntubationType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ETT">Endotracheal Tube (ETT)</SelectItem>
                          <SelectItem value="Tracheostomy">Tracheostomy</SelectItem>
                          <SelectItem value="LMA">Laryngeal Mask Airway</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {intubationType === 'ETT' && (
                      <>
                        <div className="space-y-2">
                          <Label>ETT Size (mm)</Label>
                          <Select value={ettSize} onValueChange={setEttSize}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(size => (
                                <SelectItem key={size} value={size}>{size} mm</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>ETT Depth at Lip (cm)</Label>
                          <Input
                            type="number"
                            value={ettDepth}
                            onChange={(e) => setEttDepth(e.target.value)}
                            placeholder="22"
                          />
                        </div>
                      </>
                    )}

                    {intubationType === 'Tracheostomy' && (
                      <div className="space-y-2">
                        <Label>Tracheostomy Size</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {['6', '7', '8', '9'].map(size => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-yellow-800">Intubation Checklist</div>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          <li>- Verify bilateral breath sounds</li>
                          <li>- Confirm ETCO2 waveform</li>
                          <li>- Check cuff pressure (20-30 cmH2O)</li>
                          <li>- Secure tube and note depth</li>
                          <li>- Order chest X-ray for confirmation</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mask Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mask type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nasal">Nasal Mask</SelectItem>
                        <SelectItem value="oronasal">Oronasal (Full Face) Mask</SelectItem>
                        <SelectItem value="total-face">Total Face Mask</SelectItem>
                        <SelectItem value="helmet">Helmet</SelectItem>
                        <SelectItem value="nasal-pillows">Nasal Pillows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mask Size</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">Small</SelectItem>
                        <SelectItem value="M">Medium</SelectItem>
                        <SelectItem value="L">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-blue-800">NIV Contraindications</div>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1">
                          <li>- Cardiac or respiratory arrest</li>
                          <li>- Unable to protect airway</li>
                          <li>- Excessive secretions</li>
                          <li>- Hemodynamic instability</li>
                          <li>- Facial trauma or surgery</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Clinical Indication</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select indication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arf">Acute Respiratory Failure</SelectItem>
                    <SelectItem value="copd">COPD Exacerbation</SelectItem>
                    <SelectItem value="pneumonia">Pneumonia</SelectItem>
                    <SelectItem value="ards">ARDS</SelectItem>
                    <SelectItem value="post-op">Post-operative</SelectItem>
                    <SelectItem value="cardiac">Cardiogenic Pulmonary Edema</SelectItem>
                    <SelectItem value="trauma">Trauma</SelectItem>
                    <SelectItem value="neuro">Neurological (GCS &lt; 8)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional clinical notes..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('[Ventilation] Start button clicked in dialog');
                handleStartVentilation();
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Ventilation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Adjust Ventilator Settings
            </DialogTitle>
            <DialogDescription>
              Modify ventilator mode and parameters
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ventilator Mode</Label>
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VENTILATOR_MODES).map(([key, mode]) => (
                    <SelectItem key={key} value={key}>{mode.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {VENTILATOR_MODES[selectedMode as keyof typeof VENTILATOR_MODES]?.params.map(param =>
                renderParameterInput(param)
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={loading}>
              {loading ? 'Updating...' : 'Update Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Ventilation Dialog */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Square className="h-5 w-5" />
              Stop Ventilation - {patientName}
            </DialogTitle>
            <DialogDescription>
              Document reason and weaning assessment before stopping ventilation
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Tabs defaultValue="reason">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="reason">Reason</TabsTrigger>
              <TabsTrigger value="weaning">Weaning Criteria</TabsTrigger>
            </TabsList>

            <TabsContent value="reason" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Reason for Stopping</Label>
                <Select value={stopReason} onValueChange={setStopReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weaned">Successfully Weaned</SelectItem>
                    <SelectItem value="extubated">Extubated - Stable</SelectItem>
                    <SelectItem value="tracheostomy">Converted to Tracheostomy</SelectItem>
                    <SelectItem value="niv">Transitioned to NIV</SelectItem>
                    <SelectItem value="comfort">Comfort Care / Palliation</SelectItem>
                    <SelectItem value="death">Death</SelectItem>
                    <SelectItem value="transfer">Transfer to Another Facility</SelectItem>
                    <SelectItem value="self-extubation">Self-Extubation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Enter any additional notes about stopping ventilation..."
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="weaning" className="space-y-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">Weaning Readiness Assessment</h4>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>RSBI (f/Vt)</Label>
                    <Input
                      type="number"
                      value={weaningCriteria.rsbi}
                      onChange={(e) => setWeaningCriteria({ ...weaningCriteria, rsbi: e.target.value })}
                      placeholder="< 105"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIF (cmH2O)</Label>
                    <Input
                      type="number"
                      value={weaningCriteria.nif}
                      onChange={(e) => setWeaningCriteria({ ...weaningCriteria, nif: e.target.value })}
                      placeholder="> -25"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={weaningCriteria.abgSatisfactory}
                      onCheckedChange={(checked) => setWeaningCriteria({ ...weaningCriteria, abgSatisfactory: checked })}
                    />
                    <Label>ABG satisfactory on minimal support</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={weaningCriteria.hemodynamicallyStable}
                      onCheckedChange={(checked) => setWeaningCriteria({ ...weaningCriteria, hemodynamicallyStable: checked })}
                    />
                    <Label>Hemodynamically stable (minimal/no vasopressors)</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={weaningCriteria.adequateCough}
                      onCheckedChange={(checked) => setWeaningCriteria({ ...weaningCriteria, adequateCough: checked })}
                    />
                    <Label>Adequate cough reflex</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={weaningCriteria.minimalSecretions}
                      onCheckedChange={(checked) => setWeaningCriteria({ ...weaningCriteria, minimalSecretions: checked })}
                    />
                    <Label>Minimal secretions</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={weaningCriteria.alertAndCooperative}
                      onCheckedChange={(checked) => setWeaningCriteria({ ...weaningCriteria, alertAndCooperative: checked })}
                    />
                    <Label>Alert and cooperative</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStopDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleStopVentilation} disabled={loading}>
              {loading ? 'Stopping...' : 'Confirm Stop Ventilation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export compact version for use in bed cards
export function VentilationBadge({
  isVentilated,
  mode,
  startDate
}: {
  isVentilated: boolean;
  mode?: string;
  startDate?: string;
}) {
  if (!isVentilated) return null;

  const getDuration = () => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const now = new Date();
    const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    return `${hours}h`;
  };

  return (
    <Badge className="bg-red-500 text-white animate-pulse">
      <Wind className="h-3 w-3 mr-1" />
      {mode} {getDuration()}
    </Badge>
  );
}
