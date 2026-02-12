import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout/Layout';
import { FileText, Image, Settings } from 'lucide-react';

const ContentManagerDashboard: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-3 rounded-full mr-4">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Content Manager Dashboard</h1>
            <p className="text-gray-600">Manage banners, blogs, and marketing content</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2" />
                Banner Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Content manager dashboard functionality will be implemented here.
                This includes banner management, blog posts, and marketing assets.
              </p>
              {/* Add content-manager-specific features when profile available */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Content Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Advanced content management tools and publishing workflows will be available here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ContentManagerDashboard;