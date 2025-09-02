'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' 
  },
  { 
    name: 'Upload Design', 
    href: '/upload/design', 
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' 
  },
  { 
    name: 'Upload Website', 
    href: '/upload/website', 
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' 
  },
  { 
    name: 'Submissions', 
    href: '/submissions', 
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' 
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    router.push('/signin');
  };

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="w-56 h-screen border-r border-white/10 bg-[#141414] flex flex-col">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center px-4 mb-8">
            <h1 className="text-white text-xl font-bold">Gridrr</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-black/30 text-white'
                      : 'text-gray-400 hover:bg-black/30 hover:text-white'
                  }`}
                >
                  <svg
                    className={`mr-3 h-6 w-6 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Logout Button */}
          <div className="px-2 py-4 border-t border-white/10 mt-auto">
            <button
              onClick={handleLogout}
              className="group flex items-center px-4 py-2.5 w-full text-sm font-medium text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-md transition-colors"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
