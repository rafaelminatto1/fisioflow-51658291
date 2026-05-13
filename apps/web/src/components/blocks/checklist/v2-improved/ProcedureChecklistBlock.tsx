import React, { useState } from 'react';
import { CheckCircle, Circle, Plus, Trash2 } from 'lucide-react';

export const ProcedureChecklistV2 = () => {
  const [steps, setSteps] = useState([
    { id: 1, text: 'Preparação do paciente', completed: false },
    { id: 2, text: 'Aplicação do protocolo', completed: false },
    { id: 3, text: 'Registro no prontuário', completed: false },
  ]);
  const [newStep, setNewStep] = useState('');

  const toggle = (id: number) => {
    setSteps(steps.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setSteps([...steps, { id: Date.now(), text: newStep, completed: false }]);
    setNewStep('');
  };

  const removeStep = (id: number) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  return (
    <div className="p-6 bg-slate-50 rounded-xl shadow-md max-w-md mx-auto my-4 border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <CheckCircle className="text-blue-500" size={20} />
        Checklist de Procedimento
      </h3>
      
      <div className="space-y-3 mb-6">
        {steps.map(step => (
          <div key={step.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-100">
            <button onClick={() => toggle(step.id)} className="flex items-center gap-3 text-left flex-grow">
              {step.completed ? (
                <CheckCircle className="text-green-500" size={18} />
              ) : (
                <Circle className="text-slate-300" size={18} />
              )}
              <span className={`text-sm ${step.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {step.text}
              </span>
            </button>
            <button onClick={() => removeStep(step.id)} className="text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          placeholder="Novo passo..."
          className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          onClick={addStep}
          className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
};

export default ProcedureChecklistV2;
