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
  actualBalance: string;
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
  actualBalance, 
  timeRemaining, 
  status, 
  ipfsHash,
  isOwnerVerified 
}: CampaignCardProps) {
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preservedAmount, setPreservedAmount] = useState<number | null>(null);
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
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days} hari ${hours} jam`;
    if (hours > 0) return `${hours} jam ${minutes} menit`;
    return `${minutes} menit`;
  };

  const handleCardClick = () => {
    router.push(`/campaign/${address}`);
  };

  // Safely parse numbers with fallback to 0
  const parsedActualBalance = parseFloat(actualBalance || '0') || 0;
  const parsedTarget = parseFloat(target || '0') || 0;
  const parsedRaised = parseFloat(raised || '0') || 0;
  
  // Effect to preserve the peak amount when campaign transitions to failed status
  useEffect(() => {
    const currentAmount = Math.max(parsedActualBalance, parsedRaised);
    
    // If campaign is failed and we haven't preserved amount yet
    if (status === 2 && preservedAmount === null && currentAmount > 0) {
      setPreservedAmount(currentAmount);
    }
    // Reset preservation for active campaigns
    else if (status === 0) {
      setPreservedAmount(null);
    }
  }, [status, parsedActualBalance, parsedRaised, preservedAmount]);
  
  // ✅ FIXED: Display logic based on campaign status with client-side preservation
  const displayAmount = status === 0
    ? parsedActualBalance  // Real-time for active campaigns
    : status === 1
      ? Math.max(parsedRaised, parsedActualBalance)  // Locked for successful campaigns
      : preservedAmount || Math.max(parsedRaised, parsedActualBalance);  // Use preserved amount for failed campaigns
  
  // Calculate progress percentage based on display amount
  const progressPercentage = parsedTarget > 0 
    ? Math.min((displayAmount / parsedTarget) * 100, 100)
    : 0;
  
  const hasUnrecordedDonations = parsedActualBalance > parsedRaised;
  const unrecordedAmount = hasUnrecordedDonations 
    ? parsedActualBalance - parsedRaised 
    : 0;

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
            <div className="text-right">
              <span className="text-green-600 font-semibold">{displayAmount.toFixed(2)} IDRX</span>
              {/* {hasUnrecordedDonations && (
                <div className="text-xs text-orange-600">
                  +{unrecordedAmount.toFixed(2)} IDRX (IDRX Payment)
                </div>
              )} */}
            </div>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Target:</span>
            <span>{target} IDRX</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Progress:</span>
            <span>{isNaN(progressPercentage) ? '0.0' : progressPercentage.toFixed(1)}%</span>
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
            style={{ width: `${isNaN(progressPercentage) ? 0 : Math.max(0, Math.min(progressPercentage, 100))}%` }}
          ></div>
        </div>

        {/* {hasUnrecordedDonations && (
          <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Includes IDRX payments (+{unrecordedAmount.toFixed(2)})</span>
            </div>
          </div>
        )} */}

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