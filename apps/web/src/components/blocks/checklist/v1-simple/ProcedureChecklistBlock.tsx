import React, { useState } from 'react';

export const ProcedureChecklistV1 = () => {
  const [steps, setSteps] = useState([
    { id: 1, text: 'Higienização', completed: false },
    { id: 2, text: 'Preparação', completed: false },
    { id: 3, text: 'Execução', completed: false },
  ]);

  const toggle = (id: number) => {
    setSteps(steps.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  return (
    <div className="p-4 border rounded shadow-sm max-w-sm mx-auto my-4">
      <h3 className="font-bold mb-2">Checklist</h3>
      <ul className="space-y-2">
        {steps.map(step => (
          <li key={step.id} className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={step.completed} 
              onChange={() => toggle(step.id)} 
            />
            <span className={step.completed ? 'line-through text-gray-400' : ''}>
              {step.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProcedureChecklistV1;
