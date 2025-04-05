import { useState } from 'react';
import { fal } from '@fal-ai/client';
import FileUpload from '../components/FileUpload';
import TryOnResult from '../components/TryOnResult';

// Configure FAL.AI client
fal.config({
  credentials: import.meta.env.VITE_FAL_AI_KEY,
});

export default function Home() {
  const [modelImage, setModelImage] = useState(null);
  const [modelImageUrl, setModelImageUrl] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [garmentImageUrl, setGarmentImageUrl] = useState(null);
  const [category, setCategory] = useState('tops');
  const [resultUrls, setResultUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [advancedOptions, setAdvancedOptions] = useState({
    showAdvanced: false,
    garmentPhotoType: 'auto',
    nsfwFilter: true,
    coverFeet: false,
    adjustHands: false,
    restoreBackground: false,
    restoreClothes: false,
    longTop: false,
    guidanceScale: 2,
    timesteps: 50,
    seed: 42,
    numSamples: 1,
  });

  const handleModelUpload = async (file) => {
    setModelImage(file);
    setModelImageUrl(URL.createObjectURL(file));
  };

  const handleGarmentUpload = async (file) => {
    setGarmentImage(file);
    setGarmentImageUrl(URL.createObjectURL(file));
  };

  const uploadImageToFal = async (file) => {
    try {
      const result = await fal.storage.upload(file);
      return result;
    } catch (err) {
      console.error('Upload error:', err);
      throw new Error('Failed to upload image to FAL storage');
    }
  };

  const handleTryOn = async () => {
    if (!modelImage || !garmentImage) {
      setError('Please upload both a model image and a garment image');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultUrls([]);
    setProgress('Starting try-on process...');

    try {
      // Step 1: Upload model image
      setProgress('Uploading model image...');
      const modelImageUrl = await uploadImageToFal(modelImage);
      
      // Step 2: Upload garment image
      setProgress('Uploading garment image...');
      const garmentImageUrl = await uploadImageToFal(garmentImage);

      // Step 3: Submit try-on request
      setProgress('Submitting try-on request...');
      const result = await fal.subscribe("fashn/tryon", {
        input: {
          model_image: modelImageUrl,
          garment_image: garmentImageUrl,
          category: category,
          garment_photo_type: advancedOptions.garmentPhotoType,
          nsfw_filter: advancedOptions.nsfwFilter,
          cover_feet: advancedOptions.coverFeet,
          adjust_hands: advancedOptions.adjustHands,
          restore_background: advancedOptions.restoreBackground,
          restore_clothes: advancedOptions.restoreClothes,
          long_top: advancedOptions.longTop,
          guidance_scale: advancedOptions.guidanceScale,
          timesteps: advancedOptions.timesteps,
          seed: advancedOptions.seed,
          num_samples: advancedOptions.numSamples,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            const messages = update.logs.map(log => log.message);
            setProgress(messages.join('\n'));
          }
        },
      });

      console.log('API Response:', result);

      if (!result) {
        throw new Error('No response received from API');
      }

      if (result.error) {
        throw new Error(result.error.message || 'API returned an error');
      }

      if (!result.data.images || result.data.images.length === 0) {
        throw new Error('API completed but returned no images');
      }

      setResultUrls(result.data.images.map(img => img.url));
      setProgress('Try-on completed successfully!');
    } catch (err) {
      console.error('Full error details:', err);
      
      let errorMessage = 'Failed to process images. Please try again.';
      if (err.message.includes('NSFW')) {
        errorMessage = 'Content flagged as inappropriate. Please try different images.';
      } else if (err.message.includes('size') || err.message.includes('dimension')) {
        errorMessage = 'Image size or dimensions not supported. Please try different images.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait and try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdvancedOptions = () => {
    setAdvancedOptions(prev => ({
      ...prev,
      showAdvanced: !prev.showAdvanced
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Virtual Clothes Try-On</h1>
        
        {/* Upload Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Model Photo</h2>
            <p className="text-sm text-gray-500 mb-2">
              Clear full-body photo, plain background recommended (JPEG/PNG)
            </p>
            <FileUpload 
              onUpload={handleModelUpload} 
              type="model" 
              accept="image/jpeg, image/png"
            />
            {modelImageUrl && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Preview:</h3>
                <img 
                  src={modelImageUrl} 
                  alt="Model preview" 
                  className="mt-1 max-h-40 rounded-md border border-gray-200"
                />
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Garment</h2>
            <p className="text-sm text-gray-500 mb-2">
              Front-facing garment photo, plain background recommended (JPEG/PNG)
            </p>
            <FileUpload 
              onUpload={handleGarmentUpload} 
              type="garment" 
              accept="image/jpeg, image/png"
            />
            {garmentImageUrl && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Preview:</h3>
                <img 
                  src={garmentImageUrl} 
                  alt="Garment preview" 
                  className="mt-1 max-h-40 rounded-md border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Try-On Settings</h2>
            <button
              onClick={toggleAdvancedOptions}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {advancedOptions.showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Garment Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
              >
                <option value="tops">Tops</option>
                <option value="bottoms">Bottoms</option>
                <option value="one-pieces">One Pieces</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Results</label>
              <select
                value={advancedOptions.numSamples}
                onChange={(e) => setAdvancedOptions({...advancedOptions, numSamples: parseInt(e.target.value)})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
              >
                {[1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num} {num > 1 ? 'variants' : 'variant'}</option>
                ))}
              </select>
            </div>
          </div>

          {advancedOptions.showAdvanced && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garment Photo Type</label>
                  <select
                    value={advancedOptions.garmentPhotoType}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, garmentPhotoType: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="model">On Model</option>
                    <option value="flat-lay">Flat Lay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guidance Scale ({advancedOptions.guidanceScale})</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={advancedOptions.guidanceScale}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, guidanceScale: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher values preserve more detail but may oversaturate</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Processing Steps ({advancedOptions.timesteps})</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={advancedOptions.timesteps}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, timesteps: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">More steps = better quality but slower</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="nsfwFilter"
                    checked={advancedOptions.nsfwFilter}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, nsfwFilter: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="nsfwFilter" className="ml-2 block text-sm text-gray-700">
                    NSFW Filter
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="coverFeet"
                    checked={advancedOptions.coverFeet}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, coverFeet: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="coverFeet" className="ml-2 block text-sm text-gray-700">
                    Cover Feet
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="adjustHands"
                    checked={advancedOptions.adjustHands}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, adjustHands: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="adjustHands" className="ml-2 block text-sm text-gray-700">
                    Adjust Hands
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="restoreBackground"
                    checked={advancedOptions.restoreBackground}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, restoreBackground: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="restoreBackground" className="ml-2 block text-sm text-gray-700">
                    Restore Background
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="restoreClothes"
                    checked={advancedOptions.restoreClothes}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, restoreClothes: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="restoreClothes" className="ml-2 block text-sm text-gray-700">
                    Keep Other Clothes
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="longTop"
                    checked={advancedOptions.longTop}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, longTop: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="longTop" className="ml-2 block text-sm text-gray-700">
                    Long Top
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seed Value</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={advancedOptions.seed}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, seed: parseInt(e.target.value) || 42})}
                    className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                  />
                  <button
                    onClick={() => setAdvancedOptions({...advancedOptions, seed: Math.floor(Math.random() * 100000)})}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Randomize
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Same seed + same inputs = same result</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleTryOn}
            disabled={isLoading || !modelImage || !garmentImage}
            className={`px-8 py-3 rounded-md text-white font-medium text-lg ${
              isLoading || !modelImage || !garmentImage 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            } transition-colors duration-200`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Generate Try-On'
            )}
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {progress && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Progress</h3>
                <div className="mt-2 text-sm text-blue-700 whitespace-pre-wrap">
                  <p>{progress}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          {resultUrls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resultUrls.map((url, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4">
                    <img 
                      src={url} 
                      alt={`Try-on result ${index + 1}`} 
                      className="w-full h-auto rounded-md"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/500x500?text=Image+failed+to+load';
                      }}
                    />
                  </div>
                  <div className="bg-gray-50 px-4 py-3 flex justify-end">
                    <a
                      href={url}
                      target="_blank" rel="noopener noreferrer"
                      download={`tryon-result-${index + 1}.png`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TryOnResult isLoading={isLoading} />
          )}
        </div>
      </div>
    </div>
  );
}