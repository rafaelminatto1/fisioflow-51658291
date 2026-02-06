import React, { useState } from 'react';
import { Camera, Play, Square, Settings, Zap, Target, Timer, Award, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useComputerVision, getExerciseInstructions, getFormScoreColor, getFeedbackIcon } from '../../hooks/useComputerVision';

interface ComputerVisionExerciseProps {
  patientId?: string;
  onSessionComplete?: (sessionData: { totalRepetitions?: number; duration?: number }) => void;
}

interface VisionSettings {
  modelAccuracy: 'fast' | 'balanced' | 'accurate';
  feedbackSensitivity: 'low' | 'medium' | 'high';
  showSkeleton: boolean;
}

// Componente de Feedback em Tempo Real
const RealTimeFeedbackCard: React.FC<{ feedback: { severity: string; type: string; message: string; suggestion: string } }> = ({ feedback }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 border-red-300 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'info': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className={`p-3 rounded-lg border-l-4 ${getSeverityColor(feedback.severity)} mb-2 animate-slide-in`}>
      <div className="flex items-start space-x-2">
        <span className="text-lg">{getFeedbackIcon(feedback.type)}</span>
        <div className="flex-1">
          <p className="font-medium text-sm">{feedback.message}</p>
          <p className="text-xs mt-1 opacity-75">{feedback.suggestion}</p>
        </div>
      </div>
    </div>
  );
};

// Componente de Métricas em Tempo Real
const RealTimeMetrics: React.FC<{ session: { totalRepetitions?: number; formScore?: number; averageForm?: number; caloriesBurned?: number }; processingStats: { fps?: number; latency?: number } }> = ({ session, processingStats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-600">Repetições</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">{session?.totalRepetitions || 0}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-gray-600">Forma</span>
        </div>
        <p className={`text-2xl font-bold mt-1 ${getFormScoreColor(session?.averageForm || 0)}`}>
          {session?.averageForm || 0}%
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-orange-600" />
          <span className="text-sm font-medium text-gray-600">Calorias</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">{session?.caloriesBurned || 0}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-600">FPS</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">{processingStats.fps}</p>
      </div>
    </div>
  );
};

// Componente de Calibração
const CalibrationModal: React.FC<{ isOpen: boolean; onClose: () => void; onCalibrate: (height: number, armSpan: number) => void }> = ({ isOpen, onClose, onCalibrate }) => {
  const [height, setHeight] = useState(170);
  const [armSpan, setArmSpan] = useState(170);
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleCalibrate = () => {
    onCalibrate(height, armSpan);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Calibração do Sistema</h3>

        {step === 1 && (
          <div>
            <p className="text-gray-600 mb-4">Primeiro, vamos configurar suas medidas corporais:</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="100"
                  max="250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Envergadura dos braços (cm)</label>
                <input
                  type="number"
                  value={armSpan}
                  onChange={(e) => setArmSpan(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="100"
                  max="250"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-gray-600 mb-4">Agora, posicione-se em frente à câmera com os braços estendidos lateralmente (posição T):</p>

            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Instruções:</span>
              </div>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Fique a aproximadamente 2 metros da câmera</li>
                <li>• Mantenha os braços estendidos lateralmente</li>
                <li>• Certifique-se de que todo seu corpo está visível</li>
                <li>• Permaneça imóvel por alguns segundos</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Voltar
              </button>
              <button
                onClick={handleCalibrate}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Calibrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Configurações
const SettingsPanel: React.FC<{ settings: VisionSettings; onSettingsChange: (settings: VisionSettings) => void; isOpen: boolean; onClose: () => void }> = ({ settings, onSettingsChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Configurações</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Precisão do Modelo</label>
            <select
              value={settings.modelAccuracy}
              onChange={(e) => onSettingsChange({ ...settings, modelAccuracy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fast">Rápido (menor precisão)</option>
              <option value="balanced">Balanceado</option>
              <option value="accurate">Preciso (mais lento)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sensibilidade do Feedback</label>
            <select
              value={settings.feedbackSensitivity}
              onChange={(e) => onSettingsChange({ ...settings, feedbackSensitivity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showSkeleton}
                onChange={(e) => onSettingsChange({ ...settings, showSkeleton: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Mostrar esqueleto</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showAngles}
                onChange={(e) => onSettingsChange({ ...settings, showAngles: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Mostrar ângulos</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showFeedback}
                onChange={(e) => onSettingsChange({ ...settings, showFeedback: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Mostrar feedback</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.mirrorMode}
                onChange={(e) => onSettingsChange({ ...settings, mirrorMode: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Modo espelho</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.recordSession}
                onChange={(e) => onSettingsChange({ ...settings, recordSession: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Gravar sessão</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import { ExerciseCoachAI } from '@/components/exercises/ExerciseCoachAI';

// Componente Principal
const ComputerVisionExercise: React.FC<ComputerVisionExerciseProps> = ({ onSessionComplete }) => {
  const {
    isActive,
    currentSession,
    realTimeFeedback,
    settings,
    isCalibrated,
    _cameraPermission,
    _modelLoaded,
    processingStats,
    videoRef,
    canvasRef,
    _initializeSystem,
    _startExerciseSession,
    stopExerciseSession,
    _calibrateSystem,
    _takeScreenshot,
    setSettings,
    exerciseTemplates
  } = useComputerVision();

  const [selectedExercise, setSelectedExercise] = useState<string>('squat');
  const [showCalibration, setShowCalibration] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [_isInitialized, _setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);

  // ... (existing useEffect and handlers)

  // Parar exercício
  const handleStopExercise = () => {
    stopExerciseSession();
    setSessionFinished(true);

    if (currentSession) {
      onSessionComplete?.(currentSession);
    }
  };

  // ... (existing screenshot handler)

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* AI Coach Overlay - Show when finished */}
      {sessionFinished && currentSession && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full animate-in zoom-in-95 duration-300">
            <ExerciseCoachAI 
              sessionData={{
                exerciseType: exerciseTemplates[selectedExercise]?.name || 'Exercício',
                totalRepetitions: currentSession.totalRepetitions,
                averageForm: currentSession.averageForm,
                caloriesBurned: currentSession.caloriesBurned
              }} 
            />
            <Button 
              onClick={() => setSessionFinished(false)} 
              className="w-full mt-4 rounded-xl h-12 font-bold"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análise de Exercícios com IA</h1>
          <p className="text-gray-600">Análise em tempo real da forma e execução dos exercícios</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            <Settings className="h-5 w-5" />
          </button>

          {!isCalibrated && (
            <button
              onClick={() => setShowCalibration(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center space-x-2"
            >
              <Target className="h-4 w-4" />
              <span>Calibrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Status de Calibração */}
      {!isCalibrated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Sistema não calibrado</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            É necessário calibrar o sistema antes de iniciar a análise de exercícios.
          </p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">Erro</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Métricas em Tempo Real */}
      {isActive && currentSession && (
        <RealTimeMetrics session={currentSession} processingStats={processingStats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Área de Vídeo */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Câmera de Análise</h3>

                <div className="flex items-center space-x-2">
                  {isCalibrated && (
                    <span className="flex items-center space-x-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Calibrado</span>
                    </span>
                  )}

                  <button
                    onClick={handleScreenshot}
                    disabled={!isActive}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative bg-gray-900">
              <video
                ref={videoRef}
                className="w-full h-auto"
                autoPlay
                muted
                playsInline
                style={{ transform: settings.mirrorMode ? 'scaleX(-1)' : 'none' }}
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ transform: settings.mirrorMode ? 'scaleX(-1)' : 'none' }}
              />

              {/* Overlay de Status */}
              <div className="absolute top-4 left-4 space-y-2">
                {isActive && (
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>GRAVANDO</span>
                  </div>
                )}

                <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                  FPS: {processingStats.fps} | Latência: {processingStats.latency}ms
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Controle */}
        <div className="space-y-6">
          {/* Seleção de Exercício */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Exercício</h3>

            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              disabled={isActive}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {Object.entries(exerciseTemplates).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.name}
                </option>
              ))}
            </select>

            {selectedExercise && exerciseTemplates[selectedExercise] && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  {exerciseTemplates[selectedExercise].description}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Dificuldade: {exerciseTemplates[selectedExercise].difficulty}</span>
                  <span>Músculos: {exerciseTemplates[selectedExercise].targetMuscles.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Controles</h3>

            <div className="space-y-3">
              {!isActive ? (
                <button
                  onClick={handleStartExercise}
                  disabled={!isCalibrated}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Play className="h-5 w-5" />
                  <span>Iniciar Análise</span>
                </button>
              ) : (
                <button
                  onClick={handleStopExercise}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center space-x-2"
                >
                  <Square className="h-5 w-5" />
                  <span>Parar Análise</span>
                </button>
              )}

              {!isCalibrated && (
                <button
                  onClick={() => setShowCalibration(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Target className="h-4 w-4" />
                  <span>Calibrar Sistema</span>
                </button>
              )}
            </div>
          </div>

          {/* Instruções */}
          {selectedExercise && exerciseTemplates[selectedExercise] && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Instruções</h3>

              <div className="space-y-2">
                {getExerciseInstructions(selectedExercise).map((instruction, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <span className="text-blue-600 font-medium">{index + 1}.</span>
                    <span className="text-gray-700">{instruction}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback em Tempo Real */}
          {settings.showFeedback && realTimeFeedback.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Feedback</h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {realTimeFeedback.slice(-5).map((feedback, index) => (
                  <RealTimeFeedbackCard key={index} feedback={feedback} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <CalibrationModal
        isOpen={showCalibration}
        onClose={() => setShowCalibration(false)}
        onCalibrate={handleCalibrate}
      />

      <SettingsPanel
        settings={settings}
        onSettingsChange={setSettings}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default ComputerVisionExercise;