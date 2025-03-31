import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SMEDashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dashboardData, setDashboardData] = React.useState<any>({
    projects: [],
    analytics: null,
    recentMatches: [],
    unreadMessages: 0
  });
  
  // Get user ID from local storage
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  React.useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Fetch projects
        const projectsResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            action: 'list-projects',
            smeId: userId,
            page: 1,
            pageSize: 5
          }),
        });
        
        const projectsData = await projectsResponse.json();
        
        if (!projectsResponse.ok) {
          throw new Error(projectsData.error || 'Failed to fetch projects');
        }
        
        // Fetch analytics
        const analyticsResponse = await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            action: 'get-analytics',
            userId,
            userType: 'sme',
            dataType: 'sme_metrics',
            period: 'monthly',
            limit: 1
          }),
        });
        
        const analyticsData = await analyticsResponse.json();
        
        // Fetch unread messages count
        const messagesResponse = await fetch('/api/messaging', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            action: 'get-unread-message-count',
            userId,
            userType: 'sme'
          }),
        });
        
        const messagesData = await messagesResponse.json();
        
        setDashboardData({
          projects: projectsData.projects || [],
          analytics: analyticsData.length > 0 ? analyticsData[0].data : null,
          unreadMessages: messagesData.count || 0
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [userId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/sme/projects/new">Create New Project</Link>
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 h-32 animate-pulse bg-gray-100"></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Active Projects</h3>
                <p className="text-3xl font-bold">
                  {dashboardData.analytics?.projects_by_status?.in_progress || 0}
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Total Spent</h3>
                <p className="text-3xl font-bold">
                  ${dashboardData.analytics?.total_spent?.toFixed(2) || '0.00'}
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Unread Messages</h3>
                <p className="text-3xl font-bold">
                  {dashboardData.unreadMessages}
                </p>
              </Card>
            </div>
            
            {/* Recent Projects */}
            <div>
              <h2 className="text-xl font-bold mb-4">Recent Projects</h2>
              {dashboardData.projects.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dashboardData.projects.map((project: any) => (
                        <tr key={project.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {project.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              project.status === 'open' ? 'bg-green-100 text-green-800' :
                              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {project.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(project.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link href={`/sme/projects/${project.id}`} className="text-primary hover:text-primary-dark">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-gray-500 mb-4">You don't have any projects yet.</p>
                  <Button asChild>
                    <Link href="/sme/projects/new">Create Your First Project</Link>
                  </Button>
                </Card>
              )}
            </div>
            
            {/* Quick Links */}
            <div>
              <h2 className="text-xl font-bold mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-medium mb-2">Find Consultants</h3>
                  <p className="text-gray-500 mb-4">Browse our network of sustainability experts.</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/consultants">Browse Consultants</Link>
                  </Button>
                </Card>
                
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-medium mb-2">Sustainability Toolkits</h3>
                  <p className="text-gray-500 mb-4">Ready-made resources for your sustainability journey.</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/toolkits">Browse Toolkits</Link>
                  </Button>
                </Card>
                
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-medium mb-2">Subscription Plans</h3>
                  <p className="text-gray-500 mb-4">Get ongoing support with a subscription plan.</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/subscriptions">View Plans</Link>
                  </Button>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
