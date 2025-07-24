'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getMetadataFromIPFS, CampaignMetadata } from '@/utils/ipfs';
import VerificationBadge from './VerificationBadge';

interface CampaignCardProps {
  address: string;
  owner: string;
  name: string;
  target: string;
  raised: string;
  timeRemaining: number;
  status: number;
  ipfsHash: string;
  isOwnerVerified: boolean;
}

export default function CampaignCard({ 
  address, 
  owner, 
  name, 
  target, 
  raised, 
  timeRemaining, 
  status, 
  ipfsHash,
  isOwnerVerified 
}: CampaignCardProps) {
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const data = await getMetadataFromIPFS(ipfsHash);
        setMetadata(data);
      } catch (error) {
        console.error('Error loading metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (ipfsHash) {
      loadMetadata();
    } else {
      setIsLoading(false);
    }
  }, [ipfsHash]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Aktif';
      case 1: return 'Berhasil';
      case 2: return 'Gagal';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-blue-600 bg-blue-100';
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Berakhir';
    
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    
    if (days > 0) return `${days} hari ${hours} jam`;
    return `${hours} jam`;
  };

  const handleCardClick = () => {
    router.push(`/campaign/${address}`);
  };

  const progressPercentage = Math.min((parseFloat(raised) / parseFloat(target)) * 100, 100);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border animate-pulse">
        <div className="h-48 bg-gray-300 rounded-lg mb-4"></div>
        <div className="h-4 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border overflow-hidden"
    >
      {/* Campaign Image */}
      {metadata?.image && (
        <div className="h-48 w-full overflow-hidden relative">
            <Image
            src={metadata.image}
            alt={name}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
        )}
      
      <div className="p-6">
        {/* Status Badge */}
        <div className="mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>

        {/* Verification Badge */}
          <VerificationBadge isVerified={isOwnerVerified} size="sm" showText={false} />
        </div>

        {/* Campaign Title */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{name}</h3>

        {/* Creator Info dengan Verification Badge */}
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <div className="w-6 h-6 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
            <span className="text-xs font-medium">
              {metadata?.creatorName ? metadata.creatorName.charAt(0).toUpperCase() : owner.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>oleh {metadata?.creatorName || `${owner.slice(0, 6)}...${owner.slice(-4)}`}</span>
            {/* Verification Badge */}
            <VerificationBadge isVerified={isOwnerVerified} size="sm" />
          </div>
        </div>

        {/* Category */}
        {metadata?.category && (
          <div className="mb-3">
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {metadata.category}
            </span>
          </div>
        )}

        {/* Progress Info */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="font-medium">Terkumpul:</span>
            <span>{raised} IDRX</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Target:</span>
            <span>{target} IDRX</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Progress:</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Sisa Waktu:</span>
            <span>{formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Description Preview */}
        {metadata?.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {metadata.description}
          </p>
        )}

        {/* Quick Action Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          Lihat Detail
        </button>
      </div>
    </div>
  );
}