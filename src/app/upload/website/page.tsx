'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, CheckCircle, Upload, Loader2 } from 'lucide-react';
import { uploadFile } from '@/lib/fileUpload';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';

export default function UploadWebsitePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, supabase } = useAuth();
  const [website, setWebsite] = useState<{
    title: string;
    url: string;
    yourName: string;
    codedBy: string;
    email: string;
    twitter: string;
    instagram: string;
    tags: string;
    video: File | null;
    videoPreview: string;
  }>({
    title: '',
    url: '',
    yourName: '',
    codedBy: '',
    email: '',
    twitter: '',
    instagram: '',
    tags: '',
    video: null,
    videoPreview: ''
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-fill form from URL parameters or submission data
  useEffect(() => {
    const dataParam = searchParams.get('data');
    
    const fetchSubmissionData = async () => {
      if (dataParam) {
        try {
          // Decode the base64 data
          const decodedData = JSON.parse(atob(decodeURIComponent(dataParam)));
          
          // Update form with the decoded data
          setWebsite(prev => ({
            ...prev,
            title: decodedData.title || '',
            yourName: decodedData.submitted_by || '',
            codedBy: decodedData.submitted_by || '',
            email: decodedData.contactEmail || '',
            twitter: decodedData.twitterHandle || '',
            instagram: decodedData.instagramHandle || '',
            url: decodedData.websiteUrl || '',
            tags: decodedData.toolsUsed || ''
          }));
          
          // If there are additional notes, add them to the form
          if (decodedData.additionalNotes) {
            setWebsite(prev => ({
              ...prev,
              additionalNotes: decodedData.additionalNotes
            }));
          }
          
        } catch (error) {
          console.error('Error parsing submission data:', error);
        }
      }
    };
    
    fetchSubmissionData();
  }, [searchParams]);

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }
    
    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('Video file size should be less than 50MB');
      return;
    }
    
    setWebsite(prev => ({
      ...prev,
      video: file,
      videoPreview: URL.createObjectURL(file)
    }));
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file');
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('Video file must be less than 50MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setWebsite(prev => ({
      ...prev,
      video: file,
      videoPreview: previewUrl
    }));
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (website.videoPreview) {
        URL.revokeObjectURL(website.videoPreview);
      }
    };
  }, [website.videoPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    if (!user) {
      setError('You must be logged in to submit');
      setIsLoading(false);
      return;
    }
    
    if (!website.video) {
      setError('Please upload a video preview');
      setIsLoading(false);
      return;
    }
    
    if (!website.title || !website.url || !website.yourName || !website.codedBy || !website.email) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    // Basic URL validation
    try {
      new URL(website.url.startsWith('http') ? website.url : `https://${website.url}`);
    } catch (err) {
      setError('Please enter a valid URL');
      setIsLoading(false);
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(website.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      if (!website.video) {
        throw new Error('No video file selected');
      }
      
      // 1. Upload video using the new storage utility
      const uploadResult = await uploadFile(website.video, 'website-previews');
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload video');
      }
      
      // Ensure URL has https:// prefix
      const formattedUrl = website.url.startsWith('http') ? website.url : `https://${website.url}`;
      
      // 2. Save website to database
      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .insert({
          title: website.title,
          url: formattedUrl,
          built_with: website.codedBy,
          tags: website.tags,
          preview_video_url: uploadResult.url,
          email: website.email,
          submitted_by: user?.id || null,
          twitter_handle: website.twitter || null,
          instagram_handle: website.instagram || null,
          status: 'pending'
        })
        .select()
        .single();
      
      if (websiteError) throw websiteError;
      
      // 3. Show success toast and reset form
      toast.success('Website submitted successfully! It will be reviewed soon.');
      setWebsite({
        title: '',
        url: '',
        yourName: '',
        codedBy: '',
        email: '',
        twitter: '',
        instagram: '',
        tags: '',
        video: null,
        videoPreview: ''
      });
      
      // 4. Redirect to submissions page after a short delay
      setTimeout(() => {
        router.push('/submissions');
      }, 2000);
      
    } catch (err: unknown) {
      console.error('Submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while submitting. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 flex overflow-hidden">
      <div className="fixed left-0 top-0 h-full w-64">
        <Sidebar />
      </div>
      <main className="flex-1 ml-64 overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-[#141414] rounded-lg shadow-xl p-6 sm:p-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Submit Your Website
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Share your creation with our community. Fill in the details below to submit your website for review.
            </p>
          </div>
          
          {/* Status Messages */}
          <div className="space-y-4 mb-8">
            {error && (
              <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-200">Error</h3>
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-r-lg flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-green-200">Success!</h3>
                  <p className="text-sm text-green-100">{success}</p>
                </div>
              </div>
            )}
          </div>
      
          <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-700/50 shadow-xl">
            {/* Website Info Section */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Website Information</h2>
                <p className="text-sm text-gray-400">Tell us about your website</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Name of Website <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={website.title}
                    onChange={(e) => setWebsite({...website, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                    placeholder="e.g., My Awesome Portfolio"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Website URL <span className="text-red-400">*</span>
                  </label>
                  <div className="flex rounded-lg overflow-hidden shadow-sm">
                    <span className="inline-flex items-center px-4 bg-gray-700 text-gray-300 text-sm border border-r-0 border-gray-600">
                      https://
                    </span>
                    <input
                      type="text"
                      id="url"
                      value={website.url}
                      onChange={(e) => setWebsite({...website, url: e.target.value})}
                      className="flex-1 min-w-0 block w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                      placeholder="example.com"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Author Info Section */}
            <div className="space-y-6 pt-2">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Author Information</h2>
                <p className="text-sm text-gray-400">Tell us about yourself</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="yourName" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="yourName"
                    value={website.yourName}
                    onChange={(e) => setWebsite({...website, yourName: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={website.email}
                    onChange={(e) => setWebsite({...website, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="codedBy" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Built By <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="codedBy"
                    value={website.codedBy}
                    onChange={(e) => setWebsite({...website, codedBy: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                    placeholder="Developer/Team name"
                    required
                  />
                </div>
            
                <div>
                  <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Twitter (optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">@</span>
                    </div>
                    <input
                      type="text"
                      id="twitter"
                      value={website.twitter}
                      onChange={(e) => setWebsite({...website, twitter: e.target.value})}
                      className="pl-6 w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                      placeholder="username"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="instagram" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Instagram (optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">@</span>
                    </div>
                    <input
                      type="text"
                      id="instagram"
                      value={website.instagram}
                      onChange={(e) => setWebsite({...website, instagram: e.target.value})}
                      className="pl-6 w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                      placeholder="username"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={website.tags}
                    onChange={(e) => setWebsite({...website, tags: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#141414] text-white transition duration-200"
                    placeholder="e.g., React, Next.js, Tailwind CSS"
                  />
                  <p className="mt-1 text-xs text-gray-500">Add relevant tags to help users discover your website</p>
                </div>
              </div>
            </div>
            
            {/* Video Upload Section */}
            <div className="space-y-6 pt-2">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Video Preview</h2>
                <p className="text-sm text-gray-400">Upload a short video showcasing your website</p>
              </div>
              
              <div className="mt-1 flex justify-center px-6 pt-8 pb-10 border-2 border-dashed border-gray-700 rounded-xl hover:border-blue-500/50 transition-colors duration-200">
                <div className="space-y-3 text-center">
                  {website.videoPreview ? (
                    <div className="space-y-4">
                      <video
                        src={website.videoPreview}
                        className="mx-auto max-w-full h-auto max-h-64 rounded-lg shadow-lg border border-gray-700/50"
                        controls
                      />
                      <div className="text-sm text-green-400 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        {website.video?.name} ({(website.video?.size ? (website.video.size / (1024 * 1024)).toFixed(1) : '0.0')} MB)
                      </div>
                      <button
                        type="button"
                        onClick={() => setWebsite({...website, video: null, videoPreview: ''})}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove video
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto h-12 w-12 text-gray-500">
                        <svg className="mx-auto h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="flex text-sm text-gray-400 justify-center">
                        <label
                          htmlFor="video-upload"
                          className="relative cursor-pointer bg-gray-900/50 hover:bg-gray-800/80 px-4 py-2 rounded-lg font-medium text-blue-400 hover:text-blue-300 transition-colors border border-dashed border-gray-700 hover:border-blue-500/50"
                        >
                          <span>Choose a file</span>
                          <input
                            id="video-upload"
                            name="video-upload"
                            type="file"
                            className="sr-only"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            required={!website.video}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        MP4, WebM up to 50MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full sm:w-auto flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 ${
                  isLoading ? 'opacity-80 cursor-wait' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="-ml-1 mr-2 h-5 w-5" />
                    Submit Website
                  </>
                )}
              </button>
              
              <p className="mt-3 text-xs text-gray-500 text-center">
                By submitting, you agree to our terms and conditions. Your website will be reviewed before being published.
              </p>
            </div>
          </form>
          </div>
        </div>
      </main>
    </div>
  );
}
