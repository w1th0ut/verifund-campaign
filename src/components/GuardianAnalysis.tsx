'use client';

import { GuardianAnalysisData } from '@/utils/ipfs';

interface GuardianAnalysisProps {
  analysis: GuardianAnalysisData;
}

export default function GuardianAnalysis({ analysis }: GuardianAnalysisProps) {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Rendah':
        return {
          bg: 'bg-green-50',
          text: 'text-green-800',
          badge: 'bg-green-200 text-green-800',
          icon: '🟢'
        };
      case 'Sedang':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          badge: 'bg-yellow-200 text-yellow-800',
          icon: '🟡'
        };
      case 'Tinggi':
        return {
          bg: 'bg-red-50',
          text: 'text-red-800',
          badge: 'bg-red-200 text-red-800',
          icon: '🔴'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-800',
          badge: 'bg-gray-200 text-gray-800',
          icon: '⚪'
        };
    }
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const colors = getRiskLevelColor(analysis.riskLevel);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="mr-3 text-2xl">🛡️</div>
        <h2 className="text-xl font-bold text-gray-800">
          Analisis Verifund Guardian
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credibility Score */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-3">Skor Kredibilitas</h3>
          <div className="flex items-center mb-3">
            <div className="flex-1 bg-blue-200 rounded-full h-4 mr-3">
              <div 
                className={`h-4 rounded-full transition-all duration-300 ${getCredibilityColor(analysis.credibilityScore)}`}
                style={{ width: `${analysis.credibilityScore}%` }}
              ></div>
            </div>
            <span className="font-bold text-blue-800 text-lg">
              {analysis.credibilityScore}/100
            </span>
          </div>
          <div className="text-sm text-blue-700">
            {analysis.credibilityScore >= 80 && "Kredibilitas sangat baik"}
            {analysis.credibilityScore >= 60 && analysis.credibilityScore < 80 && "Kredibilitas baik"}
            {analysis.credibilityScore >= 40 && analysis.credibilityScore < 60 && "Kredibilitas cukup"}
            {analysis.credibilityScore < 40 && "Kredibilitas perlu ditingkatkan"}
          </div>
        </div>

        {/* Risk Level */}
        <div className={`p-4 rounded-lg ${colors.bg}`}>
          <h3 className={`font-semibold ${colors.text} mb-3`}>Tingkat Risiko</h3>
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{colors.icon}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
              {analysis.riskLevel}
            </span>
          </div>
          <div className={`text-sm ${colors.text}`}>
            {analysis.riskLevel === 'Rendah' && "Kampanye ini memiliki risiko rendah"}
            {analysis.riskLevel === 'Sedang' && "Kampanye ini memiliki risiko sedang"}
            {analysis.riskLevel === 'Tinggi' && "Kampanye ini memiliki risiko tinggi"}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Ringkasan Analisis</h3>
        <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Suggestions section removed from public display as it's only relevant for creators during campaign creation */}

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-xs text-yellow-800">
          ⚠️ <strong>Disclaimer:</strong> Analisis ini dihasilkan oleh AI dan bersifat informatif. 
          Silakan gunakan penilaian Anda sendiri dalam membuat keputusan donasi.
        </p>
      </div>
    </div>
  );
}
