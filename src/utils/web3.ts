import { ethers } from 'ethers';
import CampaignFactoryABI from '@/contracts/CampaignFactory.json';
import CampaignABI from '@/contracts/Campaign.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  async connectWallet(): Promise<string> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    
    return await this.signer.getAddress();
  }

  async createCampaign(
  name: string,
  targetAmount: string,
  durationInDays: number,
  ipfsHash: string
): Promise<string> {
  if (!this.signer) {
    throw new Error('Wallet not connected');
  }

  const factoryAddress = process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS!;
  const factory = new ethers.Contract(factoryAddress, CampaignFactoryABI.abi, this.signer);

  // Dapatkan decimals dari IDRX token
  const idrxTokenAddress = process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!;
  const tokenContract = new ethers.Contract(
    idrxTokenAddress,
    ["function decimals() external view returns (uint8)"],
    this.signer
  );
  
  const decimals = await tokenContract.decimals();
  const targetAmountInUnits = ethers.parseUnits(targetAmount, decimals);
  
  const tx = await factory.createCampaign(name, targetAmountInUnits, durationInDays, ipfsHash);
  const receipt = await tx.wait();
  
  return receipt.hash;
}


  async getAllCampaigns(): Promise<string[]> {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const factoryAddress = process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS!;
    const factory = new ethers.Contract(factoryAddress, CampaignFactoryABI.abi, provider);
    
    return await factory.getDeployedCampaigns();
  }

  async getCampaignInfo(campaignAddress: string) {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const campaign = new ethers.Contract(campaignAddress, CampaignABI.abi, provider);
  
  // Dapatkan decimals untuk format yang benar
  const idrxTokenAddress = process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!;
  const tokenContract = new ethers.Contract(
    idrxTokenAddress,
    ["function decimals() external view returns (uint8)"],
    provider
  );
  
  const [info, decimals] = await Promise.all([
    campaign.getCampaignInfo(),
    tokenContract.decimals()
  ]);

  return {
    owner: info[0],
    name: info[1],
    target: ethers.formatUnits(info[2], decimals), // Format dengan decimals yang benar
    raised: ethers.formatUnits(info[3], decimals), // Format dengan decimals yang benar
    timeRemaining: Number(info[4]),
    status: Number(info[5])
  };
}

  // Fungsi untuk mendapatkan detail lengkap termasuk metadata
  async getCampaignDetails(campaignAddress: string) {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const campaign = new ethers.Contract(campaignAddress, CampaignABI.abi, provider);
  
  // Dapatkan decimals dari IDRX token
  const idrxTokenAddress = process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!;
  const tokenContract = new ethers.Contract(
    idrxTokenAddress,
    ["function decimals() external view returns (uint8)"],
    provider
  );
  
  const [info, ipfsHash, decimals] = await Promise.all([
    campaign.getCampaignInfo(),
    campaign.ipfsHash(),
    tokenContract.decimals()
  ]);

  return {
    address: campaignAddress,
    owner: info[0],
    name: info[1],
    target: ethers.formatUnits(info[2], decimals), // Gunakan decimals yang benar
    raised: ethers.formatUnits(info[3], decimals), // Gunakan decimals yang benar
    timeRemaining: Number(info[4]),
    status: Number(info[5]),
    ipfsHash
  };
}


  // Fungsi untuk donate
  async donateToCampaign(campaignAddress: string, amount: string): Promise<string> {
  if (!this.signer) {
    throw new Error('Wallet not connected');
  }

  const userAddress = await this.signer.getAddress();
  const idrxTokenAddress = process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!;
  
  // Dapatkan decimals dari contract
  const tokenContract = new ethers.Contract(
    idrxTokenAddress, 
    [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function balanceOf(address owner) external view returns (uint256)"
    ], 
    this.signer
  );

  const decimals = await tokenContract.decimals();
  const amountInUnits = ethers.parseUnits(amount, decimals); // Gunakan parseUnits dengan decimals yang benar

  // 1. Periksa saldo IDRX
  const balance = await tokenContract.balanceOf(userAddress);
  const balanceFormatted = ethers.formatUnits(balance, decimals);
  
  if (parseFloat(balanceFormatted) < parseFloat(amount)) {
    throw new Error(`Insufficient IDRX balance. You have ${balanceFormatted} IDRX, need ${amount} IDRX`);
  }

  // 2. Periksa saldo LSK untuk gas
  const gasBalance = await this.checkGasBalance(userAddress);
  console.log('ETH LISK Sepolia Balance:', gasBalance);
  if (parseFloat(gasBalance) < 0.00001) {
    throw new Error(`Insufficient LSK for gas. You need at least 0.001 LSK for transaction fees`);
  }

  try {
    const currentAllowance = await tokenContract.allowance(userAddress, campaignAddress);
    
    // Jika allowance sudah cukup, skip approve
    if (currentAllowance >= amountInUnits) {
      console.log('Sufficient allowance already exists, skipping approve');
    } else {
      // Reset allowance ke 0 dulu jika ada allowance sebelumnya
      if (currentAllowance > 0) {
        console.log('Resetting existing allowance to 0');
        const resetTx = await tokenContract.approve(campaignAddress, 0);
        await resetTx.wait();
      }

      // Approve jumlah yang dibutuhkan
      console.log('Approving tokens...');
      const approveTx = await tokenContract.approve(campaignAddress, amountInUnits);
      await approveTx.wait();
      console.log('Tokens approved successfully');
    }

    // 4. Lakukan donasi
    const campaign = new ethers.Contract(campaignAddress, CampaignABI.abi, this.signer);
    const donateTx = await campaign.donate(amountInUnits);
    const receipt = await donateTx.wait();

    return receipt.hash;
  } catch (error: any) {
    console.error('Detailed error:', error);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for gas fees. Please add more LSK to your wallet.');
    } else if (error.reason) {
      throw new Error(`Transaction failed: ${error.reason}`);
    } else {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
}

  // Fungsi untuk withdraw (owner only)
  async withdrawFromCampaign(campaignAddress: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const campaign = new ethers.Contract(campaignAddress, CampaignABI.abi, this.signer);
    const tx = await campaign.withdraw();
    const receipt = await tx.wait();

    return receipt.hash;
  }

  // Fungsi untuk refund (donor only)
  async refundFromCampaign(campaignAddress: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const campaign = new ethers.Contract(campaignAddress, CampaignABI.abi, this.signer);
    const tx = await campaign.refund();
    const receipt = await tx.wait();

    return receipt.hash;
  }

  // Fungsi untuk cek donasi user
  async getUserDonation(campaignAddress: string, userAddress: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const campaign = new ethers.Contract(campaignAddress, CampaignABI.abi, provider);
    
    // Dapatkan decimals untuk format yang benar
    const idrxTokenAddress = process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!;
    const tokenContract = new ethers.Contract(
        idrxTokenAddress,
        ["function decimals() external view returns (uint8)"],
        provider
    );
    
    const [donation, decimals] = await Promise.all([
        campaign.donations(userAddress),
        tokenContract.decimals()
    ]);
    
    return ethers.formatUnits(donation, decimals);
    }

  async checkTokenBalance(walletAddress: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const tokenContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS!,
        [
        "function balanceOf(address owner) external view returns (uint256)",
        "function decimals() external view returns (uint8)"
        ],
        provider
    );
    
    const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
    ]);
    
    // Gunakan formatUnits dengan decimals yang benar
    return ethers.formatUnits(balance, decimals);
    }

    async checkGasBalance(walletAddress: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const balance = await provider.getBalance(walletAddress);
    return ethers.formatEther(balance);
    }
}

export const web3Service = new Web3Service();