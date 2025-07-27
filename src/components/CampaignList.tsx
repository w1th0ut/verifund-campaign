'use client';

import { useState, useEffect } from 'react';
import { web3Service } from '@/utils/web3';
import CampaignCard from './CampaignCard';

interface Campaign {
  address: string;
  owner: string;
  name: string;
  target: string;
  raised: string;
  actualBalance: string;
  timeRemaining: number;
  status: number;
  ipfsHash: string;
  isOwnerVerified: boolean;
}

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const campaignAddresses = await web3Service.getAllCampaigns();
      const campaignData = await Promise.all(
        campaignAddresses.map(async (address) => {
          const details = await web3Service.getCampaignDetails(address);
          return details;
        })
      );
      setCampaigns(campaignData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Semua Kampanye</h2>
        <button
          onClick={loadCampaigns}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh
        </button>
      </div>
      
      {campaigns.length === 0 ? (
        <p className="text-gray-600 text-center py-8">Belum ada kampanye yang dibuat.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.address}
              address={campaign.address}
              owner={campaign.owner}
              name={campaign.name}
              target={campaign.target}
              raised={campaign.raised}
              actualBalance={campaign.actualBalance}
              timeRemaining={campaign.timeRemaining}
              status={campaign.status}
              ipfsHash={campaign.ipfsHash}
              isOwnerVerified={campaign.isOwnerVerified}
            />
          ))}
        </div>
      )}
    </div>
  );
}