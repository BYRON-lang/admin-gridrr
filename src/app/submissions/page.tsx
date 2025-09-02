'use client';

import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

type Database = any; // You might want to define proper database types
const supabase = createClientComponentClient<Database>();

type Submission = {
  id: string;
  title: string;
  submission_type: 'website' | 'design';
  submitted_by: string;
  created_at: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  contact_email: string;
  twitter_handle: string | null;
  instagram_handle: string | null;
  website_submissions?: {
    website_url: string;
    tools_used: string | string[];
  }[];
  design_submissions?: {
    design_type: string;
    tools_used: string | string[];
  }[];
  submission_media?: {
    media_url: string;
    media_type: string;
  }[];
};

export default function SubmissionsPage() {
  const auth = useAuth();
  const user = auth?.user;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: keyof Submission, direction: 'asc' | 'desc'} | null>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            website_submissions(*),
            design_submissions(*),
            submission_media(*)
          `);
          
        if (error) throw error;
        setSubmissions(data || []);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError('Failed to load submissions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmissions();
  }, [user]);

  const filteredSubmissions = submissions.filter(submission => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      submission.title.toLowerCase().includes(searchLower) ||
      submission.submitted_by.toLowerCase().includes(searchLower) ||
      submission.id.toLowerCase().includes(searchLower) ||
      submission.contact_email.toLowerCase().includes(searchLower);
    
    const matchesFilter = filter === 'all' || submission.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = a[sortConfig.key];
    let bValue: any = b[sortConfig.key];
    
    // Handle date comparison
    if (sortConfig.key === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }
    
    if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof Submission) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      'pending': { text: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      'in_review': { text: 'In Review', class: 'bg-blue-100 text-blue-800' },
      'approved': { text: 'Approved', class: 'bg-green-100 text-green-800' },
      'rejected': { text: 'Rejected', class: 'bg-red-100 text-red-800' },
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getSubmissionType = (submission: Submission) => {
    if (submission.website_submissions && submission.website_submissions.length > 0) {
      return 'Website';
    } else if (submission.design_submissions && submission.design_submissions.length > 0) {
      return 'Design';
    }
    return 'Unknown';
  };
  
  const getToolsUsed = (submission: Submission) => {
    const websiteTools = submission.website_submissions?.[0]?.tools_used;
    const designTools = submission.design_submissions?.[0]?.tools_used;
    
    if (websiteTools) {
      return Array.isArray(websiteTools) ? websiteTools.join(', ') : websiteTools;
    } else if (designTools) {
      return Array.isArray(designTools) ? designTools.join(', ') : designTools;
    }
    return 'Not specified';
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Please sign in to view this page.</div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading submissions...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-black">
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">Submissions</h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search submissions..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-[#141414] rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => requestSort('id')}
                    >
                      <div className="flex items-center">
                        ID
                        {sortConfig?.key === 'id' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => requestSort('title')}
                    >
                      <div className="flex items-center">
                        Title
                        {sortConfig?.key === 'title' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Tools Used
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => requestSort('submitted_by')}
                    >
                      <div className="flex items-center">
                        Submitted By
                        {sortConfig?.key === 'submitted_by' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => requestSort('created_at')}
                    >
                      <div className="flex items-center">
                        Submitted At
                        {sortConfig?.key === 'created_at' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {sortConfig?.key === 'status' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#141414] divide-y divide-gray-700">
                  {sortedSubmissions.length > 0 ? (
                    sortedSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-400">
                          {submission.id.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{submission.title}</div>
                          {submission.contact_email && (
                            <div className="text-xs text-gray-400">{submission.contact_email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/50 text-blue-300">
                            {getSubmissionType(submission)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-300 max-w-[200px] truncate" title={getToolsUsed(submission)}>
                            {getToolsUsed(submission)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{submission.submitted_by}</div>
                          <div className="flex space-x-2 mt-1">
                            {submission.twitter_handle && (
                              <a 
                                href={`https://twitter.com/${submission.twitter_handle.replace('@', '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs"
                              >
                                {submission.twitter_handle}
                              </a>
                            )}
                            {submission.instagram_handle && (
                              <a 
                                href={`https://instagram.com/${submission.instagram_handle.replace('@', '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 text-xs"
                              >
                                {submission.instagram_handle}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(submission.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            href={`/submissions/${submission.id}`}
                            className="text-blue-400 hover:text-blue-300 mr-3"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-400">
                        No submissions found. Check back later!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination - Will be implemented later */}
            {sortedSubmissions.length > 0 && (
              <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    disabled
                    className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-500 bg-gray-800 cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-500 bg-gray-800 cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      Showing <span className="font-medium">1</span> to{' '}
                      <span className="font-medium">{Math.min(10, sortedSubmissions.length)}</span> of{' '}
                      <span className="font-medium">{sortedSubmissions.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        disabled
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-700 bg-gray-700 text-sm font-medium text-gray-400 cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        className="z-10 bg-blue-600 border-blue-500 text-white relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                      >
                        1
                      </button>
                      <button
                        disabled
                        className="bg-gray-700 border-gray-700 text-gray-500 relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-not-allowed"
                      >
                        2
                      </button>
                      <button
                        disabled
                        className="bg-gray-700 border-gray-700 text-gray-500 relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-not-allowed"
                      >
                        3
                      </button>
                      <button
                        disabled
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-700 bg-gray-700 text-sm font-medium text-gray-400 cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}