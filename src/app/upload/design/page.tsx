'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { uploadFile } from '@/lib/fileUpload';
import Sidebar from '@/components/Sidebar';

type DesignSubmission = {
  title: string;
  designerName: string;
  email: string;
  twitter: string;
  instagram: string;
  toolsUsed: string;
  tags: string;
  image: File | null;
  imagePreview: string;
};

export default function UploadDesignPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [design, setDesign] = useState<DesignSubmission>({
    title: '',
    designerName: '',
    email: '',
    twitter: '',
    instagram: '',
    toolsUsed: '',
    tags: '',
    image: null,
    imagePreview: ''
  });
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-fill form from URL parameters if they exist
  useEffect(() => {
    const dataParam = searchParams.get('data');
    
    if (dataParam) {
      try {
        const decodedData = JSON.parse(atob(dataParam));
        setDesign(prev => ({
          ...prev,
          title: decodedData.title || '',
          designerName: decodedData.designerName || '',
          email: decodedData.email || '',
          twitter: decodedData.twitter || '',
          instagram: decodedData.instagram || ''
        }));
      } catch (error) {
        console.error('Error parsing submission data:', error);
      }
    }
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setDesign({
        ...design,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!design.title || !design.designerName || !design.email || !design.twitter || !design.instagram || !design.toolsUsed || !design.image) {
      setError('Please fill in all required fields and select an image');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(design.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    const supabase = createClientComponentClient();
    
    try {
      // 1. Upload image using the file upload utility
      const uploadResult = await uploadFile(design.image, 'designs');
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }
      
      // 3. Create design record
      const { data: designRecord, error: designError } = await supabase
        .from('designs')
        .insert({
          title: design.title,
          description: design.tags ? `Tags: ${design.tags}` : '',
          designer_name: design.designerName,
          designer_email: design.email,
          twitter_handle: design.twitter.startsWith('@') ? design.twitter : `@${design.twitter}`,
          instagram_handle: design.instagram.startsWith('@') ? design.instagram : `@${design.instagram}`,
          tools_used: design.toolsUsed.split(',').map(tool => tool.trim()).filter(Boolean),
          tags: design.tags ? design.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          image_url: uploadResult.url,
          status: 'pending'
        })
        .select()
        .single();
      
      if (designError) {
        throw new Error(`Failed to save design: ${designError.message}`);
      }
      
      
      setSuccess('Design uploaded successfully!');
      
      // Reset form
      setDesign({
        title: '',
        designerName: '',
        email: '',
        twitter: '',
        instagram: '',
        toolsUsed: '',
        tags: '',
        image: null,
        imagePreview: ''
      });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (err) {
      const error = err as Error;
      setError(`Failed to upload design: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-black">
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Upload Design</h1>
      
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Name of Design <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={design.title}
            onChange={(e) => setDesign({...design, title: e.target.value})}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter the name of your design"
            required
          />
        </div>
        
        <div>
          <label htmlFor="designerName" className="block text-sm font-medium text-gray-300 mb-1">
            Designer's Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="designerName"
            value={design.designerName}
            onChange={(e) => setDesign({...design, designerName: e.target.value})}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter designer's name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Your Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={design.email}
            onChange={(e) => setDesign({...design, email: e.target.value})}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your.email@example.com"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-1">
              Twitter <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">@</span>
              </div>
              <input
                type="text"
                id="twitter"
                value={design.twitter}
                onChange={(e) => setDesign({...design, twitter: e.target.value})}
                className="block w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-300 mb-1">
              Instagram <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">@</span>
              </div>
              <input
                type="text"
                id="instagram"
                value={design.instagram}
                onChange={(e) => setDesign({...design, instagram: e.target.value})}
                className="block w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
                required
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Upload Design <span className="text-red-500">*</span>
          </label>
          {design.imagePreview ? (
            <div className="mt-2">
              <img 
                src={design.imagePreview} 
                alt="Design preview" 
                className="max-h-64 rounded-md"
              />
              <button
                type="button"
                onClick={() => setDesign({...design, image: null, imagePreview: ''})}
                className="mt-2 text-sm text-red-500 hover:text-red-400 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove image
              </button>
            </div>
          ) : (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-gray-900 rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none"
                  >
                    <span>Upload an image</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageChange}
                      required
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="toolsUsed" className="block text-sm font-medium text-gray-300 mb-1">
              Tools Used <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="toolsUsed"
              value={design.toolsUsed}
              onChange={(e) => setDesign({...design, toolsUsed: e.target.value})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Figma, Photoshop, Illustrator"
              required
            />
            <p className="mt-1 text-xs text-gray-400">List the tools you used for this design (comma separated)</p>
          </div>
          
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={design.tags}
              onChange={(e) => setDesign({...design, tags: e.target.value})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., UI, Dashboard, Dark Mode"
            />
            <p className="mt-1 text-xs text-gray-400">Optional: Add tags to help categorize your design (comma separated)</p>
          </div>
        </div>
            
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border-2 border-white/20 rounded-2xl text-sm font-medium text-white hover:border-white/40 focus:outline-none transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 border-2 border-blue-600 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 hover:border-blue-700 focus:outline-none transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Uploading...' : 'Upload Design'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
