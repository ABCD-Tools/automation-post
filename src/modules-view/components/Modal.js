export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        style={{ pointerEvents: 'auto' }}
      />

      <div
        className={`
          relative bg-white rounded-lg shadow-2xl
          ${sizeClasses[size]} w-full
          max-h-[90vh]
          flex flex-col
        `}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        {title && (
          <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div 
          className="flex-1 min-h-0 px-6 py-4 scrollbar-visible"
          style={{
            overflowY: 'scroll',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E0 #F7FAFC'
          }}
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>

      {/* Webkit Scrollbar Styles */}
      <style jsx>{`
        .scrollbar-visible::-webkit-scrollbar {
          width: 12px;
        }
        .scrollbar-visible::-webkit-scrollbar-track {
          background: #F7FAFC;
          border-radius: 10px;
        }
        .scrollbar-visible::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 10px;
        }
        .scrollbar-visible::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
      `}</style>
    </div>
  );
}