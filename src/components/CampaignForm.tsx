'use client';

import { useState } from 'react';
import { uploadToIPFS, uploadImageToIPFS } from '@/utils/ipfs';
import { web3Service } from '@/utils/web3';

interface CampaignFormData {
  creatorName: string;
  name: string;
  category: string;
  description: string;
  targetAmount: string;
  durationInDays: number;
  image: File | null;
}

export default function CampaignForm() {
  const [formData, setFormData] = useState<CampaignFormData>({
    creatorName: '',
    name: '',
    category: '',
    description: '',
    targetAmount: '',
    durationInDays: 30,
    image: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'durationInDays' ? parseInt(value) : value
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

  const connectWallet = async () => {
    try {
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
    } catch (error) {
      alert('Failed to connect wallet: ' + (error as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!walletAddress) {
        await connectWallet();
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
      };

      const ipfsHash = await uploadToIPFS(metadata);
      
      const txHash = await web3Service.createCampaign(
        formData.name,
        formData.targetAmount,
        formData.durationInDays,
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
        durationInDays: 30,
        image: null,
      });
      
    } catch (error) {
      alert('Error creating campaign: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Buat Kampanye Baru</h2>
      
      {!walletAddress && (
        <div className="mb-6 text-center">
          <button
            onClick={connectWallet}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {walletAddress && (
        <div className="mb-4 p-3 bg-green-100 rounded">
          <p className="text-sm text-green-800">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
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
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durasi (hari)
          </label>
          <input
            type="number"
            name="durationInDays"
            value={formData.durationInDays}
            onChange={handleInputChange}
            required
            min="1"
            max="365"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !walletAddress}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Membuat Kampanye...' : 'Buat Kampanye'}
        </button>
      </form>
    </div>
  );
}