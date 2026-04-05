import React from 'react';

interface ConfirmationCardProps {
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmationCard: React.FC<ConfirmationCardProps> = ({ text, onConfirm, onCancel, loading }) => {
  return (
    <div className={`bg-[#fffbeb] dark:bg-yellow-900/20 border-1.5 border-[#fbbf24] rounded-xl p-4 my-4 animate-[fadeSlideUp_0.2s_ease-out] ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="text-[13px] font-medium text-ink-2 uppercase mb-1 flex items-center gap-1.5">
        <span className="text-[#fbbf24]">⚠</span> Ready to save
      </div>
      <p className="text-[15px] text-ink mb-3">{text}</p>
      <div className="flex gap-2">
        <button 
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-surface border border-outline-variant rounded-[10px] text-sm font-medium text-on-surface transition-all active:scale-95 disabled:opacity-50"
        >
          Cancel
        </button>
        <button 
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-[10px] text-sm font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm'
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationCard;
