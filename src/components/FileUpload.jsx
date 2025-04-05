import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function FileUpload({ onUpload, type }) {
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    
    reader.onload = () => {
      setPreview(reader.result);
      onUpload(file);
    };
    
    reader.readAsDataURL(file);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer 
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <img 
          src={preview} 
          alt="Preview" 
          className="max-h-64 mx-auto rounded-md"
        />
      ) : (
        <div>
          <p className="text-gray-600">
            {isDragActive ? 
              'Drop the image here' : 
              `Drag & drop your ${type} image here, or click to select`}
          </p>
          <p className="text-sm text-gray-500 mt-2">Supports: JPEG, JPG, PNG</p>
        </div>
      )}
    </div>
  );
}