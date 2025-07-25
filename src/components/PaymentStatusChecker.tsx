'use client';

import { useState } from 'react';

export default function PaymentStatusChecker() {
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!reference.trim()) {
      alert('Masukkan kode referensi pembayaran');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/idrx/transaction-history?transactionType=MINT&reference=${reference}`
      );
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        setStatus(null);
        alert('Transaksi tidak ditemukan');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      alert('Error saat mengecek status pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PAID': 'text-green-600',
      'WAITING_FOR_PAYMENT': 'text-yellow-600',
      'EXPIRED': 'text-red-600',
      'MINTED': 'text-blue-600',
      'PROCESSING': 'text-orange-600',
      'FAILED': 'text-red-600',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Cek Status Pembayaran</h3>
      
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Masukkan kode referensi pembayaran"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={checkStatus}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Cek Status'}
        </button>
      </div>

      {status && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Status Pembayaran:</span>
              <p className={`font-semibold ${getStatusColor(status.paymentStatus)}`}>
                {status.paymentStatus}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Status Minting:</span>
              <p className={`font-semibold ${getStatusColor(status.userMintStatus)}`}>
                {status.userMintStatus}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Jumlah:</span>
              <p className="font-semibold">{status.toBeMinted} IDRX</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Pembayaran:</span>
              <p className="font-semibold">{new Intl.NumberFormat('id-ID').format(status.paymentAmount)} IDR</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Nama:</span>
              <p>{status.customerVaName}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Email:</span>
              <p>{status.email}</p>
            </div>
          </div>
          
          {status.txHash && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="font-medium text-gray-600 text-sm">Transaction Hash:</span>
              <a 
                href={`https://sepolia-blockscout.lisk.com/tx/${status.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:underline text-sm break-all"
              >
                {status.txHash}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}