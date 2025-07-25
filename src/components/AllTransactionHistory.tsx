'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface WalletTransaction {
  type: 'wallet';
  donor: string;
  amount: string;
  timestamp: number;
  status: 'COMPLETED';
  txHash: string;
  blockNumber: number;
}

interface IDRXTransaction {
  type: 'idrx';
  id: number;
  donor: string;
  email: string;
  amount: string;
  paymentAmount: number;
  timestamp: number;
  paymentStatus: string;
  userMintStatus: string;
  reference: string;
  txHash: string;
  merchantOrderId: string;
}

// ✅ Define proper interface for IDRX API response
interface IDRXTransactionRaw {
  id: number;
  customerVaName: string;
  email: string;
  toBeMinted: string;
  paymentAmount: number;
  createdAt: string;
  paymentStatus: string;
  userMintStatus: string;
  reference: string;
  txHash: string;
  merchantOrderId: string;
}

interface IDRXAPIResponse {
  success: boolean;
  data: IDRXTransactionRaw[];
}

type Transaction = WalletTransaction | IDRXTransaction;

interface AllTransactionHistoryProps {
  campaignAddress: string;
}

export default function AllTransactionHistory({ campaignAddress }: AllTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ✅ Fix: Use useCallback to prevent dependency warning
  const loadAllTransactions = useCallback(async () => {
    try {
      setLoading(true);

      // Load wallet transactions dan IDRX transactions secara parallel
      const [walletTxs, idrxTxs] = await Promise.all([
        loadWalletTransactions(),
        loadIDRXTransactions()
      ]);

      // Combine dan sort by timestamp (newest first)
      const allTxs = [...walletTxs, ...idrxTxs].sort((a, b) => b.timestamp - a.timestamp);
      
      // Pagination client-side (10 per page)
      const startIndex = (page - 1) * 10;
      const endIndex = startIndex + 10;
      const paginatedTxs = allTxs.slice(startIndex, endIndex);
      
      setTransactions(paginatedTxs);
      setTotalPages(Math.ceil(allTxs.length / 10));
    } catch (error) {
      console.error('Error loading all transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignAddress, page]); // ✅ Include dependencies

  useEffect(() => {
    loadAllTransactions();
  }, [loadAllTransactions]); // ✅ Include loadAllTransactions as dependency

  const loadWalletTransactions = async (): Promise<WalletTransaction[]> => {
    try {
      console.log('🔍 Loading wallet transactions for:', campaignAddress);
      
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      
      const CampaignABI = await import('@/contracts/Campaign.json');
      
      const campaignContract = new ethers.Contract(
        campaignAddress,
        CampaignABI.abi,
        provider
      );

      console.log('📝 Contract created, getting events...');

      const donationFilter = campaignContract.filters.Donated();
      const events = await campaignContract.queryFilter(donationFilter);
      
      console.log('✅ Found Donated events:', events.length);

      if (events.length === 0) {
        console.log('⚠️ No wallet transactions found');
        return [];
      }

      const walletTxs = await Promise.all(
        events.map(async (event) => {
          const receipt = await provider.getTransactionReceipt(event.transactionHash);
          const block = await provider.getBlock(receipt!.blockNumber);
          const token = new ethers.Contract(
            process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!,
            ["function decimals() view returns(uint8)"],
            provider
          );
          const decimals = await token.decimals();

          return {
            type: 'wallet' as const,
            donor: (event as ethers.EventLog).args[0],
            amount: ethers.formatUnits((event as ethers.EventLog).args[1], decimals),
            timestamp: block!.timestamp,
            status: 'COMPLETED' as const,
            txHash: event.transactionHash,
            blockNumber: receipt!.blockNumber
          };
        })
      );

      console.log('✅ Processed wallet transactions:', walletTxs);
      return walletTxs;
    } catch (error) {
      console.error('❌ Error loading wallet transactions:', error);
      return [];
    }
  };

  const loadIDRXTransactions = async (): Promise<IDRXTransaction[]> => {
    try {
      const response = await fetch(
        `/api/idrx/transaction-history?transactionType=MINT&campaignAddress=${campaignAddress}&page=1&take=1000`
      );
      
      const result: IDRXAPIResponse = await response.json(); // ✅ Proper typing
      
      if (result.success && result.data) {
        // ✅ Fix: Use proper typing instead of any
        return result.data.map((tx: IDRXTransactionRaw) => ({
          type: 'idrx' as const,
          id: tx.id,
          donor: tx.customerVaName || 'Anonymous',
          email: tx.email,
          amount: tx.toBeMinted,
          paymentAmount: tx.paymentAmount,
          timestamp: new Date(tx.createdAt).getTime() / 1000,
          paymentStatus: tx.paymentStatus,
          userMintStatus: tx.userMintStatus,
          reference: tx.reference,
          txHash: tx.txHash,
          merchantOrderId: tx.merchantOrderId
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading IDRX transactions:', error);
      return [];
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'COMPLETED': 'bg-green-100 text-green-800',
      'PAID': 'bg-green-100 text-green-800',
      'WAITING_FOR_PAYMENT': 'bg-yellow-100 text-yellow-800',
      'EXPIRED': 'bg-red-100 text-red-800',
      'MINTED': 'bg-blue-100 text-blue-800',
      'PROCESSING': 'bg-orange-100 text-orange-800',
      'FAILED': 'bg-red-100 text-red-800',
    };

    return statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('id-ID');
  };

  const formatAmount = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID').format(Number(amount));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Riwayat Semua Donasi</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Riwayat Semua Donasi</h3>
      
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Belum ada donasi untuk kampanye ini.
        </p>
      ) : (
        <div className="space-y-4">
          {/* ✅ Fix: Remove unused index parameter */}
          {transactions.map((tx) => (
            <div key={tx.type === 'wallet' ? tx.txHash : tx.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">
                      {tx.type === 'wallet' 
                        ? `${tx.donor.slice(0, 6)}...${tx.donor.slice(-4)}`
                        : tx.donor
                      }
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.type === 'wallet' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {tx.type === 'wallet' ? 'WALLET' : 'IDRX'}
                    </span>
                  </div>
                  {tx.type === 'idrx' && (
                    <p className="text-sm text-gray-600">{tx.email}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-green-600">
                    {formatAmount(tx.amount)} IDRX
                  </p>
                  {tx.type === 'idrx' && (
                    <p className="text-sm text-gray-500">
                      ({formatAmount(tx.paymentAmount)} IDR)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                {tx.type === 'wallet' ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tx.status)}`}>
                    {tx.status}
                  </span>
                ) : (
                  <>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tx.paymentStatus)}`}>
                      {tx.paymentStatus}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tx.userMintStatus)}`}>
                      {tx.userMintStatus}
                    </span>
                  </>
                )}
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                {tx.type === 'idrx' && (
                  <>
                    <p>Reference: {tx.reference}</p>
                    <p>Order ID: {tx.merchantOrderId}</p>
                  </>
                )}
                {tx.type === 'wallet' && (
                  <p>Block: #{tx.blockNumber}</p>
                )}
                <p>Tanggal: {formatDate(tx.timestamp)}</p>
                {tx.txHash && (
                  <p>
                    Tx Hash: 
                    <a 
                      href={`https://sepolia-blockscout.lisk.com/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </a>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center mt-6 space-x-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}