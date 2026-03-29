import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  isThinking?: boolean;
}

const ThinkingAnimation = React.memo(() => (
  <div className="flex gap-1.5 py-1 px-0.5 items-center">
    <div className="typing-dot" />
    <div className="typing-dot" />
    <div className="typing-dot" />
  </div>
));
ThinkingAnimation.displayName = 'ThinkingAnimation';

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, isThinking }) => {
  const isUser = role === 'user';

  return (
    <div
      className={`flex mb-2 ${isThinking ? '' : 'animate-[fadeSlideUp_0.2s_ease-out]'} ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Assistant avatar dot */}
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full shrink-0 mt-1 mr-2 flex items-center justify-center text-[12px] font-bold"
          style={{
            backgroundColor: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
          }}
        >
          ✦
        </div>
      )}

      <div
        className={`max-w-[85%] lg:max-w-[75%] px-4 py-2.5 text-[14.5px] leading-relaxed ${
          isUser
            ? 'rounded-[20px] rounded-br-[6px]'
            : 'rounded-[20px] rounded-tl-[6px]'
        }`}
        style={
          isUser
            ? {
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }
            : {
                backgroundColor: 'var(--surface-container-high)',
                color: 'var(--on-surface)',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              }
        }
      >
        {isThinking ? <ThinkingAnimation /> : content}
      </div>
    </div>
  );
};

export default ChatBubble;
