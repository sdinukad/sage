import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  isThinking?: boolean;
}

const ThinkingAnimation = React.memo(() => (
  <div className="flex gap-1.5 py-1 px-1">
    <div className="typing-dot" />
    <div className="typing-dot" />
    <div className="typing-dot" />
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
