interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function VerificationBadge({ 
  isVerified, 
  size = 'md', 
  showText = true 
}: VerificationBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base'
  };

  return (
    <div className="flex items-center space-x-1">
      <div className={`${sizeClasses[size]} bg-blue-500 rounded-full flex items-center justify-center`}>
        <svg 
          className="w-3 h-3 text-white" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
      {showText && (
        <span className={`${sizeClasses[size]} font-medium text-blue-600`}>
          Terverifikasi
        </span>
      )}
    </div>
  );
}