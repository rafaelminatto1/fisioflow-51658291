import React, { useState, useEffect } from 'react';
import { Camera, Settings, Play, Pause, Square, RotateCcw, Volume2, VolumeX, Eye, EyeOff, Target, Zap, Award, Clock, TrendingUp } from 'lucide-react';
import { useAugmentedReality, formatDuration, getDifficultyLabel, getFeedbackColor, getTrackingQualityColor } from '../../hooks/useAugmentedReality';

interface AugmentedRealityExerciseProps {
  patientId: string;
}

// Componente para exibir métricas em tempo real
const RealtimeMetrics: React.FC<{ stats: any }> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(stats.duration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span>{stats.completedSteps}/{stats.totalSteps}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span>{stats.accuracy}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          <span>{stats.score}</span>
        </div>
      </div>
    </div>
  );
};

// Componente para exibir feedback AR
const ARFeedback: React.FC<{ feedback: any[] }> = ({ feedback }) => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {feedback.map((item) => (
        <div
          key={item.id}
          className={`mb-2 p-3 rounded-lg bg-black bg-opacity-80 text-white text-center animate-fade-in ${
            item.type === 'success' ? 'border-l-4 border-green-500' :
            item.type === 'warning' ? 'border-l-4 border-yellow-500' :
            item.type === 'error' ? 'border-l-4 border-red-500' :
            'border-l-4 border-blue-500'
          }`}
        >
          <p className={`font-medium ${getFeedbackColor(item.type)}`}>
            {item.message}
          </p>
        </div>
      ))}
    </div>
  );
};

// Componente para instruções do exercício
const ExerciseInstructions: React.FC<{ exercise: any; currentStep: number }> = ({ exercise, currentStep }) => {
  if (!exercise || currentStep >= exercise.instructions.length) return null;

  const instruction = exercise.instructions[currentStep];

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">{instruction.title}</h3>
        <span className="text-sm bg-blue-600 px-2 py-1 rounded">
          Passo {instruction.step}/{exercise.instructions.length}
        </span>
      </div>
      <p className="text-sm mb-2">{instruction.description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-300">
        <span>Duração: {formatDuration(instruction.duration)}</span>
        <span>Marcadores: {instruction.markers.length}</span>
      </div>
    </div>
  );
};

// Componente para calibração AR
const ARCalibration: React.FC<{ 
  calibration: any; 
  onCalibrate: () => void; 
  isCalibrating: boolean;
  isCalibrated: boolean;
}> = ({ calibration, onCalibrate, isCalibrating, isCalibrated }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Calibração AR</h3>
        <div className={`px-3 py-1 rounded-full text-sm ${
          isCalibrated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isCalibrated ? 'Calibrado' : 'Não Calibrado'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Qualidade do Rastreamento
          </label>
          <span className={`text-sm font-medium ${getTrackingQualityColor(calibration.trackingQuality)}`}>
            {calibration.trackingQuality === 'excellent' ? 'Excelente' :
             calibration.trackingQuality === 'good' ? 'Boa' : 'Ruim'}
          </span>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condições de Iluminação
          </label>
          <span className="text-sm">
            {calibration.lightingConditions === 'high' ? 'Alta' :
             calibration.lightingConditions === 'medium' ? 'Média' : 'Baixa'}
          </span>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Escala do Ambiente
          </label>
          <span className="text-sm">{calibration.roomScale}x</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nível do Chão
          </label>
          <span className="text-sm">{calibration.floorLevel}m</span>
        </div>
      </div>
      
      <button
        onClick={onCalibrate}
        disabled={isCalibrating}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <RotateCcw className={`w-4 h-4 ${isCalibrating ? 'animate-spin' : ''}`} />
        {isCalibrating ? 'Calibrando...' : 'Calibrar AR'}
      </button>
    </div>
  );
};

// Componente para configurações AR
const ARSettings: React.FC<{ 
  settings: any; 
  onUpdateSettings: (settings: any) => void;
}> = ({ settings, onUpdateSettings }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Configurações AR</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Instruções por Voz
          </label>
          <button
            onClick={() => onUpdateSettings({ enableVoiceInstructions: !settings.enableVoiceInstructions })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableVoiceInstructions ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enableVoiceInstructions ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Feedback Háptico
          </label>
          <button
            onClick={() => onUpdateSettings({ enableHapticFeedback: !settings.enableHapticFeedback })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableHapticFeedback ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enableHapticFeedback ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opacidade dos Marcadores: {Math.round(settings.markerOpacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.markerOpacity}
            onChange={(e) => onUpdateSettings({ markerOpacity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume do Feedback: {Math.round(settings.feedbackVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.feedbackVolume}
            onChange={(e) => onUpdateSettings({ feedbackVolume: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tamanho da Fonte
          </label>
          <select
            value={settings.instructionFontSize}
            onChange={(e) => onUpdateSettings({ instructionFontSize: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Próximo Passo Automático
          </label>
          <button
            onClick={() => onUpdateSettings({ autoNextStep: !settings.autoNextStep })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoNextStep ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.autoNextStep ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Mostrar Métricas de Performance
          </label>
          <button
            onClick={() => onUpdateSettings({ showPerformanceMetrics: !settings.showPerformanceMetrics })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.showPerformanceMetrics ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.showPerformanceMetrics ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Gravar Sessão
          </label>
          <button
            onClick={() => onUpdateSettings({ recordSession: !settings.recordSession })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.recordSession ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.recordSession ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para seleção de exercícios
const ExerciseSelector: React.FC<{ 
  exercises: any[]; 
  onSelectExercise: (exerciseId: string) => void;
  selectedExercise: string | null;
}> = ({ exercises, onSelectExercise, selectedExercise }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Selecionar Exercício</h3>
      
      <div className="grid gap-4">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            onClick={() => onSelectExercise(exercise.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedExercise === exercise.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{exercise.name}</h4>
              <span className={`px-2 py-1 rounded text-xs ${
                exercise.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                exercise.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getDifficultyLabel(exercise.difficulty)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Categoria: {exercise.category}</span>
              <span>Duração: {formatDuration(exercise.duration)}</span>
              <span>Passos: {exercise.instructions.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal
const AugmentedRealityExercise: React.FC<AugmentedRealityExerciseProps> = ({ patientId }) => {
  const {
    exercises,
    currentExercise,
    currentSession,
    isARActive,
    isCalibrated,
    calibration,
    settings,
    markers,
    feedback,
    isLoading,
    error,
    videoRef,
    canvasRef,
    initializeAR,
    stopAR,
    calibrateAR,
    startExercise,
    stopExercise,
    nextStep,
    updateSettings,
    getSessionStats
  } = useAugmentedReality();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  const sessionStats = getSessionStats();

  // Inicializar AR automaticamente
  useEffect(() => {
    if (!isARActive && !isLoading) {
      initializeAR();
    }
  }, [isARActive, isLoading, initializeAR]);

  const handleStartExercise = () => {
    if (selectedExerciseId && isCalibrated) {
      startExercise(selectedExerciseId, patientId);
    }
  };

  const handleStopExercise = () => {
    stopExercise();
    setSelectedExerciseId(null);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro no AR</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={initializeAR}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inicializando AR</h2>
          <p className="text-gray-600">Configurando câmera e sensores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Realidade Aumentada</h1>
                <p className="text-sm text-gray-500">Exercícios com orientação AR</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-sm ${
                isARActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isARActive ? 'AR Ativo' : 'AR Inativo'}
              </div>
              
              <button
                onClick={() => setShowCalibration(!showCalibration)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Calibração"
              >
                <Target className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Configurações"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {isARActive && (
                <button
                  onClick={stopAR}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Parar AR
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentSession ? (
          /* Sessão Ativa */
          <div className="relative">
            {/* Vídeo AR */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              
              {/* Overlay de Feedback */}
              <ARFeedback feedback={feedback} />
              
              {/* Métricas em Tempo Real */}
              {settings.showPerformanceMetrics && (
                <RealtimeMetrics stats={sessionStats} />
              )}
              
              {/* Instruções */}
              <ExerciseInstructions 
                exercise={currentExercise} 
                currentStep={currentSession.currentStep} 
              />
              
              {/* Controles de Sessão */}
              <div className="absolute top-4 left-4 flex gap-2">
                <button
                  onClick={currentSession.status === 'active' ? () => {} : () => {}}
                  className="bg-black bg-opacity-70 text-white p-2 rounded-lg hover:bg-opacity-80"
                  title={currentSession.status === 'active' ? 'Pausar' : 'Continuar'}
                >
                  {currentSession.status === 'active' ? 
                    <Pause className="w-5 h-5" /> : 
                    <Play className="w-5 h-5" />
                  }
                </button>
                
                <button
                  onClick={nextStep}
                  className="bg-black bg-opacity-70 text-white p-2 rounded-lg hover:bg-opacity-80"
                  title="Próximo Passo"
                >
                  <Zap className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleStopExercise}
                  className="bg-red-600 bg-opacity-80 text-white p-2 rounded-lg hover:bg-opacity-100"
                  title="Parar Exercício"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Interface de Configuração */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Seleção de Exercício */}
            <div className="lg:col-span-2">
              <ExerciseSelector
                exercises={exercises}
                onSelectExercise={setSelectedExerciseId}
                selectedExercise={selectedExerciseId}
              />
              
              {selectedExerciseId && (
                <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Iniciar Exercício</h3>
                    <button
                      onClick={handleStartExercise}
                      disabled={!isCalibrated}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Começar
                    </button>
                  </div>
                  
                  {!isCalibrated && (
                    <p className="text-sm text-yellow-600 mt-2">
                      ⚠️ AR deve estar calibrado antes de iniciar o exercício
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Painel Lateral */}
            <div className="space-y-6">
              {/* Calibração */}
              {(showCalibration || !isCalibrated) && (
                <ARCalibration
                  calibration={calibration}
                  onCalibrate={calibrateAR}
                  isCalibrating={isLoading}
                  isCalibrated={isCalibrated}
                />
              )}
              
              {/* Configurações */}
              {showSettings && (
                <ARSettings
                  settings={settings}
                  onUpdateSettings={updateSettings}
                />
              )}
              
              {/* Status do Sistema */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Status do Sistema</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Câmera</span>
                    <span className={`text-sm font-medium ${
                      isARActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isARActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rastreamento</span>
                    <span className={`text-sm font-medium ${getTrackingQualityColor(calibration.trackingQuality)}`}>
                      {calibration.trackingQuality === 'excellent' ? 'Excelente' :
                       calibration.trackingQuality === 'good' ? 'Bom' : 'Ruim'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Calibração</span>
                    <span className={`text-sm font-medium ${
                      isCalibrated ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {isCalibrated ? 'Calibrado' : 'Pendente'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Exercícios</span>
                    <span className="text-sm font-medium text-blue-600">
                      {exercises.length} disponíveis
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AugmentedRealityExercise;