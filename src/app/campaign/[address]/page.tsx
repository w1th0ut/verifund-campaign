'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@xellar/kit';
import Image from 'next/image';
import { web3Service } from '@/utils/web3';
import { getMetadataFromIPFS, CampaignMetadata } from '@/utils/ipfs';
import VerificationBadge from '@/components/VerificationBadge';

interface CampaignDetails {
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

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignAddress = params.address as string;
  
  // Wagmi hooks untuk wallet management
  const { address: userWallet, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useConnectModal();
  
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [userDonation, setUserDonation] = useState<string>('0');
  const [donateAmount, setDonateAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Wrap functions dengan useCallback untuk fix dependency warning
  const loadCampaignDetails = useCallback(async () => {
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
  }, [campaignAddress]);

  const loadUserDonation = useCallback(async () => {
    if (!userWallet || !campaign) return;
    
    try {
      const donation = await web3Service.getUserDonation(campaignAddress, userWallet);
      setUserDonation(donation);
    } catch (error) {
      console.error('Error loading user donation:', error);
    }
  }, [campaignAddress, userWallet, campaign]);

  useEffect(() => {
    loadCampaignDetails();
  }, [loadCampaignDetails]);

  useEffect(() => {
    if (userWallet && campaign) {
      loadUserDonation();
    }
  }, [loadUserDonation, userWallet, campaign]);

  // Fungsi connect wallet menggunakan Xellar modal
  const connectWallet = () => {
    open();
  };

  const handleDonate = async () => {
    if (!isConnected) {
      connectWallet();
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
      alert('Error saat donasi: ' + (error as unknown as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await web3Service.withdrawFromCampaign(campaignAddress);
      alert(`Withdraw berhasil! Transaction hash: ${txHash}`);
      await loadCampaignDetails();
    } catch (error) {
      alert('Error saat withdraw: ' + (error as unknown as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await web3Service.refundFromCampaign(campaignAddress);
      alert(`Refund berhasil! Transaction hash: ${txHash}`);
      await loadCampaignDetails();
      await loadUserDonation();
    } catch (error) {
      alert('Error saat refund: ' + (error as unknown as Error).message);
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

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const isOwner = userWallet && campaign && userWallet.toLowerCase() === campaign.owner.toLowerCase();
  const hasDonated = parseFloat(userDonation) > 0;
  const progressPercentage = campaign ? Math.min((parseFloat(campaign.raised) / parseFloat(campaign.target)) * 100, 100) : 0;

  const canWithdraw = isOwner && campaign?.timeRemaining === 0 && campaign?.status === 1;
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
          <p className="text-gray-600 mb-4">Periksa alamat campaign yang Anda masukkan.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
          >
            Kembali ke Home
          </button>
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
            <div className="h-64 w-full overflow-hidden relative">
              <Image
                src={metadata.image}
                alt={campaign.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}
          
          <div className="py-3 px-20">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                {getStatusText(campaign.status)}
              </span>
              
              <div className="flex items-center space-x-3">
                {metadata?.category && (
                  <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {metadata.category}
                  </span>
                )}
                <VerificationBadge isVerified={campaign.isOwnerVerified} size="md" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-4">{campaign.name}</h1>
            
            <div className="flex items-center mb-4 text-gray-600">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {metadata?.creatorName ? metadata.creatorName.charAt(0).toUpperCase() : campaign.owner.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span>oleh {metadata?.creatorName || `${campaign.owner.slice(0, 6)}...${campaign.owner.slice(-4)}`}</span>
                {isOwner && <span className="ml-2 text-blue-600 font-medium">(Anda)</span>}
                <VerificationBadge isVerified={campaign.isOwnerVerified} size="sm" />
              </div>
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

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Detail Kampanye</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Alamat Contract:</span>
                  <p className="text-gray-800 break-all">{campaign.address}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Pemilik:</span>
                  <p className="text-gray-800 break-all">{campaign.owner}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Target:</span>
                  <p className="text-gray-800">{formatNumber(campaign.target)} IDRX</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Terkumpul:</span>
                  <p className="text-gray-800">{formatNumber(campaign.raised)} IDRX</p>
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
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatNumber(campaign.raised)} IDRX
                </div>
                <div className="text-gray-600">
                  dari target {formatNumber(campaign.target)} IDRX
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

              {/* Wallet Connection Status */}
              {isConnected && userWallet ? (
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-green-800 font-medium">✅ Wallet Connected</div>
                      <div className="text-xs text-green-600">
                        {userWallet.slice(0, 6)}...{userWallet.slice(-4)}
                      </div>
                    </div>
                    <button
                      onClick={() => disconnect()}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Disconnect
                    </button>
                  </div>
                  {parseFloat(userDonation) > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="text-sm text-green-700">Donasi Anda:</div>
                      <div className="font-semibold text-green-800">{formatNumber(userDonation)} IDRX</div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md mb-4 transition-colors"
                >
                  Connect Wallet
                </button>
              )}

              {/* Donation Section */}
              {isConnected && campaign.status === 0 && !isOwner && (
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
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 transition-colors"
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
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 transition-colors"
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
              {isConnected && !isOwner && (
                <div className="space-y-3">
                  {canRefund && (
                    <button
                      onClick={handleRefund}
                      disabled={isProcessing}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 transition-colors"
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