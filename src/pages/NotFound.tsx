import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout/Layout';

export default function NotFoundPage() {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-6 max-w-md">
          <div className="space-y-3">
            <h1 className="text-8xl font-bold text-blue-600">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800">Page Not Found</h2>
            <p className="text-gray-600">It looks like you are lost — don’t worry, you are in a safe place. Let’s explore our market together.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="/">Return Home</a>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
