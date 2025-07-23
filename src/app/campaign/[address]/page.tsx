'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { web3Service } from '@/utils/web3';
import { getMetadataFromIPFS, CampaignMetadata } from '@/utils/ipfs';

interface CampaignDetails {
  address: string;
  owner: string;
  name: string;
  target: string;
  raised: string;
  timeRemaining: number;
  status: number;
  ipfsHash: string;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignAddress = params.address as string;
  
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [userWallet, setUserWallet] = useState<string>('');
  const [userDonation, setUserDonation] = useState<string>('0');
  const [donateAmount, setDonateAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadCampaignDetails();
  }, [campaignAddress]);

  useEffect(() => {
    if (userWallet && campaign) {
      loadUserDonation();
    }
  }, [userWallet, campaign]);

  const loadCampaignDetails = async () => {
    try {
      const details = await web3Service.getCampaignDetails(campaignAddress);
      setCampaign(details);

      if (details.ipfsHash) {
        const meta = await getMetadataFromIPFS(details.ipfsHash);
        setMetadata(meta);
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDonation = async () => {
    try {
      const donation = await web3Service.getUserDonation(campaignAddress, userWallet);
      setUserDonation(donation);
    } catch (error) {
      console.error('Error loading user donation:', error);
    }
  };

  const connectWallet = async () => {
    try {
      const address = await web3Service.connectWallet();
      setUserWallet(address);
    } catch (error) {
      alert('Failed to connect wallet: ' + (error as Error).message);
    }
  };

  const handleDonate = async () => {
    if (!userWallet) {
      await connectWallet();
      return;
    }

    if (!donateAmount || parseFloat(donateAmount) <= 0) {
      alert('Masukkan jumlah donasi yang valid');
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await web3Service.donateToCampaign(campaignAddress, donateAmount);
      alert(`Donasi berhasil! Transaction hash: ${txHash}`);
      setDonateAmount('');
      await loadCampaignDetails();
      await loadUserDonation();
    } catch (error) {
      alert('Error saat donasi: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userWallet) {
      await connectWallet();
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await web3Service.withdrawFromCampaign(campaignAddress);
      alert(`Withdraw berhasil! Transaction hash: ${txHash}`);
      await loadCampaignDetails();
    } catch (error) {
      alert('Error saat withdraw: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!userWallet) {
      await connectWallet();
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await web3Service.refundFromCampaign(campaignAddress);
      alert(`Refund berhasil! Transaction hash: ${txHash}`);
      await loadCampaignDetails();
      await loadUserDonation();
    } catch (error) {
      alert('Error saat refund: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

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

  const isOwner = userWallet && campaign && userWallet.toLowerCase() === campaign.owner.toLowerCase();
  const hasDonated = parseFloat(userDonation) > 0;
  const progressPercentage = campaign ? Math.min((parseFloat(campaign.raised) / parseFloat(campaign.target)) * 100, 100) : 0;

  // Kondisi untuk withdraw: owner, campaign ended, target reached
  const canWithdraw = isOwner && campaign?.timeRemaining === 0 && campaign?.status === 1;
  
  // Kondisi untuk refund: donor, campaign ended, target not reached
  const canRefund = hasDonated && campaign?.timeRemaining === 0 && campaign?.status === 2;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Campaign tidak ditemukan</h1>
          <p className="text-gray-600">Periksa alamat campaign yang Anda masukkan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors group"
        >
          <svg className="w-5 h-5 mr-2 group-hover:translate-x-[-4px] transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Kembali ke Home</span>
        </button>
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          {metadata?.image && (
            <div className="h-64 w-full overflow-hidden">
              <img
                src={metadata.image}
                alt={campaign.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                {getStatusText(campaign.status)}
              </span>
              
              {metadata?.category && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  {metadata.category}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-4">{campaign.name}</h1>
            
            <div className="flex items-center mb-4 text-gray-600">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {metadata?.creatorName ? metadata.creatorName.charAt(0).toUpperCase() : campaign.owner.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <span>oleh {metadata?.creatorName || `${campaign.owner.slice(0, 6)}...${campaign.owner.slice(-4)}`}</span>
              {isOwner && <span className="ml-2 text-blue-600 font-medium">(Anda)</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Deskripsi Kampanye</h2>
              <div className="prose max-w-none">
                {metadata?.description ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {metadata.description}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">Tidak ada deskripsi tersedia.</p>
                )}
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Detail Kampanye</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Alamat Contract:</span>
                  <p className="text-gray-800 break-all">{campaign.address}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Pemilik:</span>
                  <p className="text-gray-800">{campaign.owner}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Target:</span>
                  <p className="text-gray-800">{campaign.target} IDRX</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Terkumpul:</span>
                  <p className="text-gray-800">{campaign.raised} IDRX</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Sisa Waktu:</span>
                  <p className="text-gray-800">{formatTimeRemaining(campaign.timeRemaining)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Progress:</span>
                  <p className="text-gray-800">{progressPercentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Progress Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {campaign.raised} IDRX
                </div>
                <div className="text-gray-600">
                  dari target {campaign.target} IDRX
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              <div className="text-center text-sm text-gray-600 mb-4">
                {formatTimeRemaining(campaign.timeRemaining)} tersisa
              </div>

              {/* User Donation Info */}
              {userWallet && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-1">Donasi Anda:</div>
                  <div className="font-semibold text-gray-800">{userDonation} IDRX</div>
                </div>
              )}

              {/* Connect Wallet Button */}
              {!userWallet && (
                <button
                  onClick={connectWallet}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md mb-4"
                >
                  Connect Wallet
                </button>
              )}

              {/* Donate Section */}
              {userWallet && campaign.status === 0 && !isOwner && (
                <div className="mb-4">
                  <div className="mb-3">
                    <input
                      type="number"
                      placeholder="Jumlah donasi (IDRX)"
                      value={donateAmount}
                      onChange={(e) => setDonateAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={handleDonate}
                    disabled={isProcessing}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Donasi Sekarang'}
                  </button>
                </div>
              )}

              {/* Owner Actions */}
              {isOwner && (
                <div className="space-y-3">
                  {canWithdraw && (
                    <button
                      onClick={handleWithdraw}
                      disabled={isProcessing}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Withdraw Dana'}
                    </button>
                  )}
                  
                  {!canWithdraw && campaign.status === 0 && (
                    <div className="text-sm text-gray-600 text-center p-3 bg-gray-50 rounded-md">
                      Withdraw akan tersedia setelah campaign berakhir dan target tercapai
                    </div>
                  )}
                </div>
              )}

              {/* Donor Refund Actions */}
              {userWallet && !isOwner && (
                <div className="space-y-3">
                  {canRefund && (
                    <button
                      onClick={handleRefund}
                      disabled={isProcessing}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Refund Donasi'}
                    </button>
                  )}
                  
                  {hasDonated && !canRefund && campaign.status !== 2 && (
                    <div className="text-sm text-gray-600 text-center p-3 bg-gray-50 rounded-md">
                      Refund akan tersedia jika campaign gagal (target tidak tercapai)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}