export default function TryOnResult({ resultUrl, isLoading }) {
    return (
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        {resultUrl ? (
          <img 
            src={resultUrl} 
            alt="Virtual try-on result" 
            className="w-full rounded-lg shadow-lg"
          />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-600">Your virtual try-on result will appear here</p>
          </div>
        )}
      </div>
    );
  }