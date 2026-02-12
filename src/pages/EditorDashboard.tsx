import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout/Layout';
import { Edit, FileText, Settings } from 'lucide-react';

const EditorDashboard: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 rounded-full mr-4">
            <Edit className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Editor Dashboard</h1>
            <p className="text-gray-600">Manage product content and descriptions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Content Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Editor dashboard functionality will be implemented here.
                This includes content editing tools and product description management.
              </p>
              {/* Add editor-specific features when profile available */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Editor Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Advanced editing tools and content review workflows will be available here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default EditorDashboard;