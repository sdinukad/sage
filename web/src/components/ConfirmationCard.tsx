import React from 'react';

interface ConfirmationCardProps {
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationCard: React.FC<ConfirmationCardProps> = ({ text, onConfirm, onCancel }) => {
  return (
    <div className="bg-[#fffbeb] dark:bg-yellow-900/20 border-1.5 border-[#fbbf24] rounded-xl p-4 my-4 animate-[fadeSlideUp_0.2s_ease-out]">
      <div className="text-[13px] font-medium text-ink-2 uppercase mb-1 flex items-center gap-1.5">
        <span className="text-[#fbbf24]">⚠</span> Confirm change
      </div>
      <p className="text-[15px] text-ink mb-3">{text}</p>
      <div className="flex gap-2">
        <button 
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-surface border border-outline-variant rounded-[10px] text-sm font-medium text-on-surface transition-all active:scale-95"
        >
          Cancel
        </button>
        <button 
          onClick={onConfirm}
          className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-[10px] text-sm font-medium transition-all active:scale-95"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default ConfirmationCard;
