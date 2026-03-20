import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  isThinking?: boolean;
}

const ThinkingAnimation = React.memo(() => (
  <div className="flex gap-1.5 py-1 px-1">
    <div className="w-2 h-2 rounded-full bg-on-surface-variant animate-[thinkingDot_1.4s_ease-in-out_infinite]" />
    <div className="w-2 h-2 rounded-full bg-on-surface-variant animate-[thinkingDot_1.4s_ease-in-out_infinite] [animation-delay:200ms]" />
    <div className="w-2 h-2 rounded-full bg-on-surface-variant animate-[thinkingDot_1.4s_ease-in-out_infinite] [animation-delay:400ms]" />
  </div>
));
ThinkingAnimation.displayName = 'ThinkingAnimation';

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, isThinking }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex flex-col mb-4 ${isThinking ? '' : 'animate-[fadeSlideUp_0.2s_ease-out]'} ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] px-4 py-3 text-[15px] ${
        isUser 
        ? 'bg-surface-container-highest text-on-surface rounded-[24px] rounded-br-[8px] border-b border-r border-[#444748]/15' 
        : 'bg-surface-container-low text-on-surface rounded-[24px] rounded-tl-[8px]'
      }`}>
        {!isUser && !isThinking && <span className="text-secondary mr-2">✦</span>}
        {isThinking ? <ThinkingAnimation /> : content}
      </div>
    </div>
  );
};

export default ChatBubble;
