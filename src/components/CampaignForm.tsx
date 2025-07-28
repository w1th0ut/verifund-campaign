'use client';

import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@xellar/kit';
import { uploadToIPFS, uploadImageToIPFS } from '@/utils/ipfs';
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

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check wallet connection terlebih dahulu
    if (!isConnected) {
      connectWallet();
      return;
    }

    setIsLoading(true);

    try {
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
      
      // Reset form
      setFormData({
        creatorName: '',
        name: '',
        category: '',
        description: '',
        targetAmount: '',
        durationInMinutes: 60, // Reset to 1 hour
        image: null,
      });
      
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
    </div>
  );
}