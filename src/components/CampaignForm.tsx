'use client';

import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@xellar/kit';
import { uploadToIPFS, uploadImageToIPFS, GuardianAnalysisData } from '@/utils/ipfs';
import { web3Service } from '@/utils/web3';

interface CampaignFormData {
  creatorName: string;
  name: string;
  category: string;
  description: string;
  targetAmount: string;
  durationInMinutes: number;
  image: File | null;
}

export default function CampaignForm() {
  // Wagmi hooks untuk wallet management
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useConnectModal();

  const [isClient, setIsClient] = useState(false);

  const [formData, setFormData] = useState<CampaignFormData>({
    creatorName: '',
    name: '',
    category: '',
    description: '',
    targetAmount: '',
    durationInMinutes: 60, // Default 1 hour
    image: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [guardianAnalysis, setGuardianAnalysis] = useState<GuardianAnalysisData | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [finalAnalysis, setFinalAnalysis] = useState<GuardianAnalysisData | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check verification status when wallet is connected
  useEffect(() => {
    const checkVerification = async () => {
      if (isConnected && address) {
        try {
          const verified = await web3Service.checkVerificationStatus(address);
          setIsVerified(verified);
        } catch (error) {
          console.error('Error checking verification status:', error);
          setIsVerified(false);
        }
      } else {
        setIsVerified(false);
      }
    };

    checkVerification();
  }, [isConnected, address]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'durationInMinutes' ? parseInt(value) : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        image: e.target.files![0]
      }));
    }
  };

  // Fungsi untuk connect wallet menggunakan Xellar modal
  const connectWallet = () => {
    open();
  };

  // Function to analyze campaign with Verifund Guardian
  const analyzeWithGuardian = async () => {
    if (!formData.description.trim()) {
      alert('Silakan isi deskripsi kampanye terlebih dahulu.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/guardian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: formData.description }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze campaign');
      }

      const analysis = await response.json();
      setGuardianAnalysis(analysis);
      
      if (isVerified) {
        // For verified users, show analysis in modal for private review
        setShowAnalysisModal(true);
      }
    } catch (error) {
      console.error('Error analyzing campaign:', error);
      alert('Gagal menganalisis kampanye. Silakan coba lagi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check wallet connection terlebih dahulu
    if (!isConnected) {
      connectWallet();
      return;
    }

    setIsLoading(true);

    try {
      // Run final AI analysis if not verified or if verified user hasn't analyzed yet
      let analysisToSave = finalAnalysis;
      if (!isVerified || !finalAnalysis) {
        const response = await fetch('/api/guardian', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description: formData.description }),
        });

        if (response.ok) {
          analysisToSave = await response.json();
          setFinalAnalysis(analysisToSave);
        }
      }

      let imageUrl = '';
      if (formData.image) {
        imageUrl = await uploadImageToIPFS(formData.image);
      }

      const metadata = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        creatorName: formData.creatorName,
        image: imageUrl,
        // Include Guardian analysis in metadata for public display
        guardianAnalysis: analysisToSave || undefined,
      };

      const ipfsHash = await uploadToIPFS(metadata);
      
      // Convert minutes to seconds for smart contract
      const durationInSeconds = formData.durationInMinutes * 60; // Convert minutes to seconds
      
      const txHash = await web3Service.createCampaign(
        formData.name,
        formData.targetAmount,
        durationInSeconds,
        ipfsHash
      );

      alert(`Campaign created successfully! Transaction hash: ${txHash}`);
      
      // Reset form and analysis states
      setFormData({
        creatorName: '',
        name: '',
        category: '',
        description: '',
        targetAmount: '',
        durationInMinutes: 60, // Reset to 1 hour
        image: null,
      });
      setGuardianAnalysis(null);
      setFinalAnalysis(null);
      setShowAnalysisModal(false);
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Buat Kampanye Baru</h2>
        
        {/* Loading state yang konsisten dengan server */}
        <div className="mb-6 text-center">
          <button 
            disabled 
            className="bg-gray-400 text-white font-bold py-2 px-4 rounded cursor-not-allowed"
          >
            Loading...
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Memuat status wallet...
          </p>
        </div>

        {/* Form skeleton */}
        <div className="space-y-4 opacity-50">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // ✅ FIX: Client-side rendering yang konsisten
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Buat Kampanye Baru</h2>
      
      {/* ✅ FIX: Wallet Connection Section - sekarang konsisten */}
      {!isConnected ? (
        <div className="mb-6 text-center">
          <button
            onClick={connectWallet}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Connect Wallet
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Hubungkan wallet Anda untuk membuat kampanye
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-green-100 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-800 font-medium">
                ✅ Wallet Connected
              </p>
              <p className="text-xs text-green-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <button
              onClick={() => disconnect()}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Pengguna
          </label>
          <input
            type="text"
            name="creatorName"
            value={formData.creatorName}
            onChange={handleInputChange}
            required
            placeholder="Masukkan nama Anda"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Judul Kampanye
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Judul yang menarik untuk kampanye Anda"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pilih Kategori</option>
            <option value="sosial">Sosial</option>
            <option value="kreatif">Kreatif</option>
            <option value="personal">Personal</option>
            <option value="pendidikan">Pendidikan</option>
            <option value="kesehatan">Kesehatan</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gambar Kampanye
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload gambar yang menarik untuk kampanye Anda (opsional)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deskripsi
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={4}
            placeholder="Ceritakan detail kampanye Anda..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Verifund Guardian Analysis Button */}
          {isConnected && (
            <div className="mt-3">
              <button
                type="button"
                onClick={analyzeWithGuardian}
                disabled={!isVerified || isAnalyzing || !formData.description.trim()}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isVerified && formData.description.trim()
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isAnalyzing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menganalisis...
                  </div>
                ) : (
                  <>🛡️ Analisis dengan Guardian</>
                )}
              </button>
              
              {/* Status messages */}
              {!isVerified && (
                <p className="text-sm text-gray-500 mt-2">
                  💡 Fitur analisis Guardian hanya tersedia untuk pengguna terverifikasi (pemegang SBT)
                </p>
              )}
              
              {isVerified && !formData.description.trim() && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ Isi deskripsi terlebih dahulu untuk menggunakan Guardian
                </p>
              )}
              
              {guardianAnalysis && !showAnalysisModal && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✅ Analisis selesai! Hasil akan disertakan saat kampanye dipublikasikan.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Dana (IDRX)
          </label>
          <input
            type="number"
            name="targetAmount"
            value={formData.targetAmount}
            onChange={handleInputChange}
            required
            min="1"
            step="0.01"
            placeholder="Contoh: 1000000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Masukkan jumlah dana yang ingin Anda kumpulkan
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durasi (menit)
          </label>
          <input
            type="number"
            name="durationInMinutes"
            value={formData.durationInMinutes}
            onChange={handleInputChange}
            required
            min="1"
            max="525600"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Berapa menit kampanye akan berjalan (1 menit - 365 hari)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 Tips: 60 menit = 1 jam, 1440 menit = 1 hari, 10080 menit = 1 minggu
          </p>
          <p className="text-xs text-green-600 mt-1">
            ✅ Durasi presisi: Smart contract mendukung durasi dalam menit yang akurat!
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isConnected}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Membuat Kampanye...
            </div>
          ) : (
            'Buat Kampanye'
          )}
        </button>

        {!isConnected && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Hubungkan wallet terlebih dahulu untuk membuat kampanye
          </p>
        )}
      </form>
      
      {/* Guardian Analysis Modal */}
      {showAnalysisModal && guardianAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">🛡️ Analisis Verifund Guardian</h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Credibility Score */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Skor Kredibilitas</h4>
                <div className="flex items-center">
                  <div className="w-full bg-blue-200 rounded-full h-3 mr-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${guardianAnalysis.credibilityScore}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-blue-800">{guardianAnalysis.credibilityScore}/100</span>
                </div>
              </div>
              
              {/* Risk Level */}
              <div className={`p-4 rounded-lg ${
                guardianAnalysis.riskLevel === 'Rendah' ? 'bg-green-50' :
                guardianAnalysis.riskLevel === 'Sedang' ? 'bg-yellow-50' :
                'bg-red-50'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  guardianAnalysis.riskLevel === 'Rendah' ? 'text-green-800' :
                  guardianAnalysis.riskLevel === 'Sedang' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>Tingkat Risiko</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  guardianAnalysis.riskLevel === 'Rendah' ? 'bg-green-200 text-green-800' :
                  guardianAnalysis.riskLevel === 'Sedang' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {guardianAnalysis.riskLevel}
                </span>
              </div>
              
              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Ringkasan Analisis</h4>
                <p className="text-gray-700">{guardianAnalysis.summary}</p>
              </div>
              
              {/* Suggestions */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Saran Perbaikan</h4>
                <ul className="list-disc list-inside space-y-1">
                  {guardianAnalysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-purple-700">{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setFinalAnalysis(guardianAnalysis);
                  setShowAnalysisModal(false);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Gunakan Analisis Ini
              </button>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md font-medium transition-colors"
              >
                Analisis Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
