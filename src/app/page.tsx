'use client';

import { useState } from 'react';
import CampaignForm from '@/components/CampaignForm';
import CampaignList from '@/components/CampaignList';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Verifund Testing</h1>
          <p className="text-gray-600">Platform Crowdfunding Terdesentralisasi</p>
        </header>

        <nav className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              Buat Kampanye
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              Lihat Kampanye
            </button>
          </div>
        </nav>

        <div className="container mx-auto">
          {activeTab === 'create' ? <CampaignForm /> : <CampaignList />}
        </div>
      </div>
    </main>
  );
}