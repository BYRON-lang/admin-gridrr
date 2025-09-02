'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { 
  Loader2, 
  Mail, 
  Globe, 
  Twitter, 
  Instagram, 
  Paperclip, 
  ArrowLeft,
  Clock,
  User,
  FileText,
  ExternalLink,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from "lucide-react";

type Database = any;
const supabase = createClientComponentClient<Database>();

type Status = 'pending' | 'in_review' | 'approved' | 'rejected';

interface SubmissionMedia {
  media_url: string;
  media_type: string;
  file_name: string;
  file_size: number;
}

interface WebsiteSubmission {
  url: string;
  tools_used: string | string[];
  built_with?: string;
}

interface DesignSubmission {
  design_type: string;
  tools_used: string | string[];
}

// Helper function to normalize tools_used to an array
const normalizeTools = (tools: string | string[] | undefined): string[] => {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools;
  return tools.split(',').map(tool => tool.trim()).filter(Boolean);
};

interface Submission {
  id: string;
  title: string;
  submission_type: 'website' | 'design';
  contact_email: string;
  twitter_handle: string | null;
  instagram_handle: string | null;
  created_at: string;
  status: Status;
  website_submissions?: WebsiteSubmission[];
  design_submissions?: DesignSubmission[];
  submission_media?: SubmissionMedia[];
  submitted_by?: string;
  additional_notes?: string;
}

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'approved':
      return 'bg-green-900/50 text-green-300 border-green-800';
    case 'rejected':
      return 'bg-red-900/50 text-red-300 border-red-800';
    case 'in_review':
      return 'bg-blue-900/50 text-blue-300 border-blue-800';
    default:
      return 'bg-yellow-900/50 text-yellow-300 border-yellow-800';
  }
};

const getStatusIcon = (status: Status) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="w-4 h-4" />;
    case 'rejected':
      return <XCircle className="w-4 h-4" />;
    case 'in_review':
      return <Eye className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<Status>('pending');
  const [isNavigating, setIsNavigating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Wait for auth to initialize and check authentication
  useEffect(() => {
    if (!auth.initialized) {
      return; // Wait for auth to initialize
    }

    if (!auth.user) {
      router.push('/signin');
      return;
    }

    setAuthChecked(true);
  }, [auth.initialized, auth.user, router]);

  // Fetch submission data only after auth is confirmed
  useEffect(() => {
    if (!authChecked || !auth.user) return;

    const fetchSubmission = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('submissions')
          .select(`*, website_submissions(*), design_submissions(*), submission_media(*)`)
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching submission:', error);
          throw error;
        }
        
        setSubmission(data);
        setSelectedStatus(data?.status || 'pending');
      } catch (error) {
        console.error('Error fetching submission:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmission();
  }, [id, authChecked, auth.user]);

  const handleApprove = async () => {
    if (!submission) {
      toast.error('No submission data available');
      return;
    }
    
    const toastId = toast.loading('Approving submission...');
    
    try {
      setIsLoading(true);
      
      // Update the submission status to 'approved'
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ 
          status: 'approved'
        })
        .eq('id', submission.id);

      if (updateError) {
        throw new Error(`Failed to update submission: ${updateError.message}`);
      }

      // If this is a website submission, add it to the websites table
      if (submission.submission_type === 'website' && submission.website_submissions?.[0]) {
        const websiteData = submission.website_submissions[0];
        
        // First check if website already exists
        const { data: existingWebsite } = await supabase
          .from('websites')
          .select('id')
          .eq('url', websiteData.url)
          .single();
          
        if (existingWebsite) {
          // Update existing website
          const { error: updateError } = await supabase
            .from('websites')
            .update({
              title: submission.title,
              built_with: websiteData.built_with || '',
              preview_video_url: submission.submission_media?.[0]?.media_url || '',
              email: submission.contact_email,
              submitted_by: submission.submitted_by || null,
              twitter_handle: submission.twitter_handle,
              instagram_handle: submission.instagram_handle,
              status: 'approved'
            })
            .eq('id', existingWebsite.id);
            
          if (updateError) {
            throw new Error(`Failed to update existing website: ${updateError.message}`);
          }
        } else {
          // Insert new website
          const { error: insertError } = await supabase
            .from('websites')
            .insert({
              title: submission.title,
              url: websiteData.url,
              built_with: websiteData.built_with || '',
              preview_video_url: submission.submission_media?.[0]?.media_url || '',
              email: submission.contact_email,
              submitted_by: submission.submitted_by || null,
              twitter_handle: submission.twitter_handle,
              instagram_handle: submission.instagram_handle,
              status: 'approved'
            });

          if (insertError) {
            throw new Error(`Failed to add to websites: ${insertError.message}`);
          }
        }
      }

      // Update local state
      setSubmission(prev => prev ? { ...prev, status: 'approved' } : null);
      setSelectedStatus('approved');
      
      toast.success('Submission approved successfully', { id: toastId });
      
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve submission', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitNew = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!submission || isNavigating) return;
    
    try {
      setIsNavigating(true);
      
      // Prepare submission data
      const submissionData: any = {
        submissionId: submission.id,
        title: submission.title,
        contactEmail: submission.contact_email,
        twitterHandle: submission.twitter_handle || '',
        instagramHandle: submission.instagram_handle || '',
        additionalNotes: submission.additional_notes || '',
        submitted_by: submission.submitted_by || '',
        coded_by: submission.submitted_by || ''
      };

      // Add submission type specific data
      if (submission.submission_type === 'website' && submission.website_submissions?.[0]) {
        submissionData.websiteUrl = submission.website_submissions[0].url;
        submissionData.builtWith = submission.website_submissions[0].built_with || '';
        const websiteTools = normalizeTools(submission.website_submissions[0].tools_used);
        if (websiteTools.length) {
          submissionData.toolsUsed = websiteTools.join(',');
        }
      } else if (submission.submission_type === 'design' && submission.design_submissions?.[0]) {
        submissionData.designType = submission.design_submissions[0].design_type;
        const designTools = normalizeTools(submission.design_submissions[0].tools_used);
        if (designTools.length) {
          submissionData.toolsUsed = designTools.join(',');
        }
      }
      
      // Encode the data as a base64 string
      const encodedData = btoa(JSON.stringify(submissionData));
      
      // Navigate to the upload page with the encoded data
      await router.push(`/upload/${submission.submission_type}?data=${encodeURIComponent(encodedData)}`);
      
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Show loading while auth is initializing
  if (!auth.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <div className="text-sm text-gray-400">Initializing...</div>
        </div>
      </div>
    );
  }

  // Show auth required message if user is not authenticated
  if (!auth.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Authentication required</div>
          <div className="text-sm text-gray-500">Redirecting to sign in...</div>
        </div>
      </div>
    );
  }

  // Show loading while fetching submission
  if (isLoading) {
    return (
      <div className="flex h-screen bg-black">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <div className="text-sm text-gray-400">Loading submission details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex h-screen bg-black">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-white mb-2">Submission not found</div>
            <div className="text-sm text-gray-400">The requested submission could not be located.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-5 w-px bg-gray-700" />
              <div>
                <h1 className="text-2xl font-semibold text-white mb-1">{submission.title}</h1>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    {submission.submission_type}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(submission.created_at).toLocaleDateString()}
                  </div>
                  {submission.submitted_by && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {submission.submitted_by}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center px-3 py-2 rounded-full border text-sm font-medium ${getStatusColor(selectedStatus)}`}>
              {getStatusIcon(selectedStatus)}
              <span className="ml-2 capitalize">{selectedStatus.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Website Details */}
              {submission.website_submissions?.[0] && (
                <Card className="border-0 shadow-lg bg-[#141414] border-gray-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-white flex items-center">
                      <Globe className="w-5 h-5 mr-2 text-blue-400" />
                      Website Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">Website URL</label>
                      <a 
                        href={submission.website_submissions[0].url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center text-blue-400 hover:text-blue-300 font-medium group"
                      >
                        {submission.website_submissions[0].url}
                        <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                    
                    {submission.website_submissions[0].built_with && (
                      <div>
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">Built With</label>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-200">
                            {submission.website_submissions[0].built_with}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {(() => {
                      const tools = normalizeTools(submission.website_submissions[0].tools_used);
                      return tools.length > 0 ? (
                        <div>
                          <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">Tools Used</label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tools.map((tool, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-300">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Design Details */}
              {submission.design_submissions?.[0] && (
                <Card className="border-0 shadow-lg bg-[#141414] border-gray-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-white flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-400" />
                      Design Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">Design Type</label>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-900/30 text-purple-300">
                          {submission.design_submissions[0].design_type}
                        </span>
                      </div>
                    </div>
                    
                    {(() => {
                      const tools = normalizeTools(submission.design_submissions[0].tools_used);
                      return tools.length > 0 ? (
                        <div>
                          <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">Tools Used</label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tools.map((tool, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-300">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Attachments */}
              {submission.submission_media && submission.submission_media.length > 0 && (
                <Card className="border-0 shadow-lg bg-[#141414] border-gray-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-white flex items-center">
                      <Paperclip className="w-5 h-5 mr-2 text-gray-400" />
                      Attachments
                      <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300">
                        {submission.submission_media.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submission.submission_media.map((media, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Paperclip className="w-5 h-5 text-blue-400" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white truncate">{media.file_name}</div>
                              <div className="text-sm text-gray-400">{formatFileSize(media.file_size)}</div>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(media.media_url, '_blank')}
                            className="ml-4 bg-transparent border-gray-600 text-gray-300 hover:bg-blue-900/30 hover:border-blue-600 hover:text-blue-300"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Notes */}
              {submission.additional_notes && (
                <Card className="border-0 shadow-lg bg-[#141414] border-gray-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-white">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-gray-300 leading-relaxed bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      {submission.additional_notes}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Contact Information */}
              <Card className="border-0 shadow-lg bg-[#141414] border-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-white">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a 
                    href={`mailto:${submission.contact_email}`}
                    className="flex items-center text-gray-300 hover:text-blue-400 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-900/50">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="font-medium">{submission.contact_email}</span>
                  </a>
                  
                  {submission.twitter_handle && (
                    <a 
                      href={`https://twitter.com/${submission.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-300 hover:text-blue-400 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-900/50">
                        <Twitter className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="font-medium">{submission.twitter_handle}</span>
                    </a>
                  )}
                  
                  {submission.instagram_handle && (
                    <a 
                      href={`https://instagram.com/${submission.instagram_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-300 hover:text-pink-400 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-pink-900/30 rounded-lg flex items-center justify-center mr-3 group-hover:bg-pink-900/50">
                        <Instagram className="w-4 h-4 text-pink-400" />
                      </div>
                      <span className="font-medium">{submission.instagram_handle}</span>
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="border-0 shadow-lg bg-[#141414] border-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-white">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleApprove}
                      disabled={isLoading || submission?.status === 'approved'}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {submission?.status === 'approved' ? 'Approved' : 'Approve Submission'}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="w-full border-red-600 text-red-400 hover:bg-red-900/20 hover:border-red-500 bg-transparent">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Submission
                    </Button>
                    <div className="pt-2 border-t border-gray-700">
                      <button 
                        type="button"
                        disabled={isNavigating}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSubmitNew}
                      >
                        {isNavigating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          `Submit New ${submission.submission_type}`
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}