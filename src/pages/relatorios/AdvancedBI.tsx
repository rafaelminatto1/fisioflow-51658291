import React from 'react';

export default function AdvancedBI() {
  // Substitua pelo seu Embed URL do Looker Studio
  const LOOKER_EMBED_URL = "https://lookerstudio.google.com/embed/reporting/0B_U5RNpwhcE6QXg4SXJxeTA/page/1M"; 

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Business Intelligence</h1>
        <p className="text-sm text-gray-500">Dados do Postgres visualizados no Looker Studio.</p>
      </div>
      <div className="flex-1 bg-gray-50 p-4">
        <iframe 
          src={LOOKER_EMBED_URL} 
          className="w-full h-full border-0 rounded-lg shadow-sm bg-white"
          allowFullScreen
        />
      </div>
    </div>
  );
}
