'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@xellar/kit';
import Image from 'next/image';
import { web3Service } from '@/utils/web3';
import { getMetadataFromIPFS, CampaignMetadata } from '@/utils/ipfs';
import VerificationBadge from '@/components/VerificationBadge';
import GuardianAnalysis from '@/components/GuardianAnalysis';
import AllTransactionHistory from '@/components/AllTransactionHistory';
import PaymentStatusChecker from '@/components/PaymentStatusChecker';

interface CampaignDetails {
  address: string;
  owner: string;
  name: string;
  target: string;
  raised: string;
  actualBalance: string;
  peakBalance: string;
  isPeakBalanceUpdated: boolean;
  timeRemaining: number;
  status: number;
  ipfsHash: string;
  isOwnerVerified: boolean;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignAddress = params.address as string;
  
  const { address: userWallet, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useConnectModal();
  
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [userDonation, setUserDonation] = useState<string>('0');
  const [donateAmount, setDonateAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showIDRXPayment, setShowIDRXPayment] = useState(false);
  const [idrxPaymentLoading, setIDRXPaymentLoading] = useState(false);
  const [donorEmail, setDonorEmail] = useState('');

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
      const donation = await web3Service.getDirectTransfers(campaignAddress, userWallet);
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

  const handleIDRXPayment = async () => {
    if (!donateAmount || parseFloat(donateAmount) <= 0) {
      alert('Masukkan jumlah donasi yang valid');
      return;
    }

    if (!donorEmail) {
      alert('Masukkan email untuk konfirmasi pembayaran');
      return;
    }

    setIDRXPaymentLoading(true);

    try {
      const response = await fetch('/api/idrx/mint-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: donateAmount,
          campaignAddress,
          donorEmail,
        }),
      });

      const result = await response.json();

      if (result.success) {
        window.open(result.paymentUrl, '_blank');
        
        alert(`Link pembayaran telah dibuat! Silakan selesaikan pembayaran. Reference: ${result.reference}`);
        
        setDonateAmount('');
        setDonorEmail('');
        setShowIDRXPayment(false);
      } else {
        alert('Gagal membuat link pembayaran: ' + result.error);
      }
    } catch (error) {
      console.error('IDRX Payment Error:', error);
      alert('Error saat membuat link pembayaran');
    } finally {
      setIDRXPaymentLoading(false);
    }
  };

  const handleUpdatePeakBalance = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await web3Service.updatePeakBalance(campaignAddress);
      alert(`Peak balance berhasil diupdate! Transaction hash: ${txHash}`);
      await loadCampaignDetails();
    } catch (error) {
      alert('Error saat update peak balance: ' + (error as unknown as Error).message);
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
      default: return 'Aktif';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-blue-600 bg-blue-100';
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
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
  
  const [preservedAmount, setPreservedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (campaign) {
      const currentActualBalance = parseFloat(campaign.actualBalance || '0') || 0;
      const currentRaised = parseFloat(campaign.raised || '0') || 0;
      const currentAmount = Math.max(currentActualBalance, currentRaised);
      
      if (campaign.status === 2 && preservedAmount === null && currentAmount > 0) {
        setPreservedAmount(currentAmount);
      }
      else if (campaign.status === 0) {
        setPreservedAmount(null);
      }
    }
  }, [campaign, preservedAmount]);
  
  const displayAmount = campaign 
    ? campaign.status === 0
      ? parseFloat(campaign.actualBalance || '0') || 0
      : campaign.status === 1 || campaign.status === 2
        ? (campaign.isPeakBalanceUpdated && parseFloat(campaign.peakBalance || '0') > 0)
          ? parseFloat(campaign.peakBalance || '0')
          : Math.max(parseFloat(campaign.raised || '0') || 0, parseFloat(campaign.actualBalance || '0') || 0)
        : preservedAmount || Math.max(parseFloat(campaign.raised || '0') || 0, parseFloat(campaign.actualBalance || '0') || 0)
    : 0;
  
  const parsedTarget = campaign ? parseFloat(campaign.target || '0') || 0 : 0;
  const progressPercentage = parsedTarget > 0 
    ? Math.min((displayAmount / parsedTarget) * 100, 100)
    : 0;

  // Check if external transfers exist (actualBalance > raised)
  const hasExternalTransfers = campaign ? 
    parseFloat(campaign.actualBalance || '0') > parseFloat(campaign.raised || '0') 
    : false;
  
  const canUpdatePeakBalance = isOwner && campaign?.timeRemaining === 0 && 
    !campaign?.isPeakBalanceUpdated && hasExternalTransfers && parseFloat(campaign?.actualBalance || '0') > 0;
  
  const canWithdraw = isOwner && campaign?.timeRemaining === 0 && 
    (campaign?.isPeakBalanceUpdated || !hasExternalTransfers) &&
    (campaign?.status === 1 ||
     (campaign?.status === 2 && campaign?.isOwnerVerified));
  
  const canRefund = hasDonated && campaign?.timeRemaining === 0 && 
    campaign?.status === 2 && !campaign?.isOwnerVerified;

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

            {/* Guardian Analysis Section */}
            {metadata?.guardianAnalysis && (
              <GuardianAnalysis analysis={metadata.guardianAnalysis} />
            )}

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
                  <p className="text-gray-800">{formatNumber(displayAmount.toString())} IDRX</p>
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
                  {formatNumber(displayAmount.toString())} IDRX
                </div>
                <div className="text-gray-600">
                  dari target {formatNumber(campaign.target)} IDRX
                </div>
                {/* Show balance info */}
                {campaign.status === 0 && parseFloat(campaign.actualBalance) !== parseFloat(campaign.raised) && (
                  <div className="text-xs text-blue-600 mt-1">
                    *Saldo aktual: {formatNumber(campaign.actualBalance)} IDRX
                  </div>
                )}
                {/* Show peak balance info for completed campaigns */}
                {(campaign.status === 1 || campaign.status === 2) && campaign.isPeakBalanceUpdated && (
                  <div className="text-xs text-green-600 mt-1">
                    📊 Peak balance tercatat: {formatNumber(campaign.peakBalance)} IDRX
                  </div>
                )}
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

              {/* Payment Methods Info */}
              {campaign.status === 0 && !isOwner && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Cara Donasi:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Dengan Wallet:</strong> Connect wallet dan bayar langsung</li>
                    <li>• <strong>Tanpa Wallet:</strong> Bayar via transfer bank/e-wallet melalui IDRX</li>
                  </ul>
                </div>
              )}

              {/* Donation Section dengan IDRX Payment */}
              {campaign.status === 0 && !isOwner && (
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

                  {/* Payment Method Selection */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Pilih Metode Pembayaran:</p>
                    
                    {/* Wallet Payment */}
                    {isConnected && (
                      <button
                        onClick={handleDonate}
                        disabled={isProcessing}
                        className="w-full mb-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? 'Processing...' : '💳 Bayar dengan Wallet'}
                      </button>
                    )}

                    {/* IDRX Payment */}
                    <button
                      onClick={() => setShowIDRXPayment(!showIDRXPayment)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      💰 Bayar dengan IDRX (Tanpa Wallet)
                    </button>
                  </div>

                  {/* IDRX Payment Form */}
                  {showIDRXPayment && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-3">Pembayaran IDRX</h4>
                      <div className="mb-3">
                        <input
                          type="email"
                          placeholder="Email untuk konfirmasi"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleIDRXPayment}
                          disabled={idrxPaymentLoading}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
                        >
                          {idrxPaymentLoading ? 'Membuat Link...' : 'Buat Link Pembayaran'}
                        </button>
                        <button
                          onClick={() => setShowIDRXPayment(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        * Anda akan diarahkan ke halaman pembayaran IDRX
                      </p>
                    </div>
                  )}

                  {!isConnected && !showIDRXPayment && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Pilih salah satu metode pembayaran di atas
                    </p>
                  )}
                </div>
              )}

              {/* Owner Actions */}
              {isOwner && (
                <div className="space-y-3">
                  {/* Update Peak Balance Button - only show if external transfers exist */}
                  {canUpdatePeakBalance && (
                    <div className="bg-yellow-50 rounded-lg p-4 mb-3">
                      <div className="text-sm text-yellow-800 font-medium mb-2">⚠️ Perlu Update Peak Balance</div>
                      <div className="text-xs text-yellow-600 mb-3">
                        Terdeteksi ada transfer langsung ke campaign ini. Sebelum withdraw, Anda harus mengupdate peak balance untuk mencatat total donasi tertinggi.
                      </div>
                      <button
                        onClick={handleUpdatePeakBalance}
                        disabled={isProcessing}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? 'Processing...' : '📊 Update Peak Balance'}
                      </button>
                    </div>
                  )}
                  
                  {/* Info for campaigns with only donate() transactions */}
                  {isOwner && campaign?.timeRemaining === 0 && !hasExternalTransfers && !campaign?.isPeakBalanceUpdated && (
                    <div className="bg-green-50 rounded-lg p-4 mb-3">
                      <div className="text-sm text-green-800 font-medium mb-2">✅ Siap Withdraw</div>
                      <div className="text-xs text-green-600">
                        Semua donasi melalui sistem, tidak perlu update peak balance secara manual.
                      </div>
                    </div>
                  )}
                  
                  {canWithdraw && (
                    <button
                      onClick={handleWithdraw}
                      disabled={isProcessing}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? 'Processing...' : 'Withdraw Dana'}
                    </button>
                  )}
                  
                  {!canWithdraw && !canUpdatePeakBalance && campaign.status === 0 && (
                    <div className="text-sm text-gray-600 text-center p-3 bg-gray-50 rounded-md">
                      {campaign.isOwnerVerified 
                        ? "Withdraw akan tersedia setelah campaign berakhir (target tidak harus tercapai karena Anda terverifikasi)"
                        : "Withdraw akan tersedia setelah campaign berakhir dan target tercapai"
                      }
                    </div>
                  )}
                  
                  {/* Show info when peak balance updated but can't withdraw yet */}
                  {campaign.isPeakBalanceUpdated && !canWithdraw && (campaign.status === 1 || campaign.status === 2) && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-800 font-medium mb-2">✅ Peak Balance Updated</div>
                      <div className="text-xs text-blue-600 mb-2">
                        Peak balance: {formatNumber(campaign.peakBalance)} IDRX
                      </div>
                      {campaign.status === 2 && !campaign.isOwnerVerified && (
                        <div className="text-xs text-blue-600">
                          Withdraw tidak tersedia karena Anda tidak terverifikasi dan target tidak tercapai.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show special message for verified owners with failed campaigns */}
                  {campaign.status === 2 && campaign.isOwnerVerified && isOwner && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-800 font-medium mb-2">🔮 Privilege Verified Owner</div>
                      <div className="text-xs text-purple-600 mb-3">
                        Sebagai pemilik terverifikasi, Anda dapat menarik dana meskipun campaign gagal.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Donor Refund Actions - Show for all users when campaign failed */}
              {!isOwner && (
                <div className="space-y-3">
                  {/* Show refund button for failed campaigns - only if user is connected and owner not verified */}
                  {campaign.status === 2 && !campaign.isOwnerVerified && isConnected && (
                    <button
                      onClick={handleRefund}
                      disabled={isProcessing}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? 'Processing...' : 'Refund Donasi'}
                    </button>
                  )}
                  
                  {/* Show refund info for failed campaigns */}
                  {campaign.status === 2 && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-800 font-medium mb-2">
                        {campaign.isOwnerVerified 
                          ? '🔮 Campaign Gagal - Owner Terverifikasi Dapat Withdraw' 
                          : '🔄 Campaign Gagal - Refund Tersedia'
                        }
                      </div>
                      {campaign.isOwnerVerified ? (
                        <div className="text-xs text-red-600">
                          Pemilik campaign ini terverifikasi dan dapat menarik dana meskipun gagal. Refund tidak tersedia.
                        </div>
                      ) : (
                        isConnected ? (
                          <div className="text-xs text-red-600">
                            {hasDonated 
                              ? `Anda dapat melakukan refund donasi sebesar ${formatNumber(userDonation)} IDRX`
                              : 'Klik tombol Refund jika Anda pernah melakukan donasi ke campaign ini'
                            }
                          </div>
                        ) : (
                          <div className="text-xs text-red-600">
                            Connect wallet untuk melakukan refund donasi Anda
                          </div>
                        )
                      )}
                    </div>
                  )}
                  
                  {/* Show info for active campaigns */}
                  {hasDonated && campaign.status === 0 && (
                    <div className="text-sm text-gray-600 text-center p-3 bg-gray-50 rounded-md">
                      Refund akan tersedia jika campaign gagal (target tidak tercapai)
                    </div>
                  )}
                  
                  {/* Show info for successful campaigns */}
                  {hasDonated && campaign.status === 1 && (
                    <div className="text-sm text-green-600 text-center p-3 bg-green-50 rounded-md">
                      ✅ Campaign berhasil! Dana telah disalurkan kepada pemilik campaign.
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          </div>
        </div>

        {/* IDRX Transaction History & Payment Status Checker */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <AllTransactionHistory campaignAddress={campaignAddress} />
          <PaymentStatusChecker />
        </div>
      </div>
    </div>
  );
}