'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase/client';

interface Stats {
  totalDesigns: number;
  totalWebsites: number;
  activeSubmissions: number;
  storageUsed: string;
}

interface Activity {
  id: number;
  type: 'design' | 'website' | 'submission';
  name: string;
  user: string;
  time: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats
        const [designs, websites, submissions, storage] = await Promise.all([
          supabase.from('designs').select('*', { count: 'exact' }),
          supabase.from('websites').select('*', { count: 'exact' }),
          supabase.from('submissions').select('*', { count: 'exact' }),
          supabase.storage.getBucket('websites'),
        ]);

        // Calculate storage used (mock for now as actual calculation requires list API)
        const storageUsed = '45%';
        
        setStats({
          totalDesigns: designs.count || 0,
          totalWebsites: websites.count || 0,
          activeSubmissions: submissions.count || 0,
          storageUsed,
        });

        // Fetch recent activity with submitter and title from submissions table
        const { data: activities, error } = await supabase
          .from('website_submissions')
          .select(`
            id,
            created_at,
            submission_id,
            submissions (
              title,
              submitted_by,
              status,
              created_at
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (activities) {
          const formattedActivities = activities.map((item: any) => ({
            id: item.id,
            type: 'submission' as const,
            name: item.submissions?.title || 'Untitled Submission',
            user: item.submissions?.submitted_by || 'Unknown User',
            time: new Date(item.created_at).toLocaleString(),
            status: item.submissions?.status || 'pending',
          }));
          setRecentActivity(formattedActivities);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Format stats for display
  const statsData = [
    { name: 'Total Designs', value: stats?.totalDesigns.toLocaleString() || '0', change: '+0%', changeType: 'increase' as const },
    { name: 'Websites', value: stats?.totalWebsites.toLocaleString() || '0', change: '+0%', changeType: 'increase' as const },
    { name: 'Active Submissions', value: stats?.activeSubmissions.toLocaleString() || '0', change: '+0%', changeType: 'increase' as const },
    { name: 'Storage Used', value: stats?.storageUsed || '0%', change: '+0%', changeType: 'increase' as const },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-black">
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-8">Dashboard Overview</h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {loading ? (
              // Loading skeleton
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-[#141414] overflow-hidden rounded-lg border border-white/10 p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-700 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              ))
            ) : (
              statsData.map((stat) => (
              <div key={stat.name} className="bg-[#141414] overflow-hidden rounded-lg border border-white/10 p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                    <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stat.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-[#141414] rounded-lg border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Recent Activity</h2>
                <button className="text-sm text-blue-400 hover:text-blue-300">View all</button>
              </div>
              <div className="flow-root">
                <ul className="divide-y divide-white/5">
                  {loading ? (
                    // Loading skeleton for activities
                    Array(3).fill(0).map((_, i) => (
                      <li key={i} className="py-3 animate-pulse">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-700"></div>
                          <div className="ml-3 w-3/4">
                            <div className="h-4 bg-gray-700 rounded w-2/3 mb-1"></div>
                            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                    <li key={activity.id} className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {activity.user.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-white">
                            {activity.user} {activity.status} {activity.name}
                          </p>
                          <p className="text-sm text-gray-400">{activity.time}</p>
                        </div>
                        <div className="ml-auto">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {activity.type}
                          </span>
                        </div>
                      </div>
                    </li>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">No recent activity</div>
                  )}
                </ul>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="bg-[#141414] rounded-lg border border-white/10 p-6">
                <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between px-4 py-3 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors">
                    <span>Upload New Design</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors">
                    <span>Add New Website</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors">
                    <span>Review Submissions</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Storage Overview */}
              <div className="mt-6 bg-[#141414] rounded-lg border border-white/10 p-6">
                <h2 className="text-lg font-medium text-white mb-4">Storage Overview</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Used: 450GB</span>
                      <span>1TB Total</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-sm text-gray-400">Upgrade storage for more space</p>
                    <button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
                      Upgrade Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
