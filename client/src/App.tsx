import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { PaymentModal } from "@/components/payment-modal";
import { CreatorModal } from "@/components/creator-modal";
import Dashboard from "@/pages/dashboard";
import CreatorOnboarding from "@/pages/creator-onboarding";
import PaymentClaim from "@/pages/payment-claim";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#28ce73] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Public routes (always available regardless of auth status)
  return (
    <Switch>
      {/* Public creator onboarding and payment claim routes */}
      <Route path="/onboarding" component={CreatorOnboarding} />
      <Route path="/claim/:token" component={PaymentClaim} />
      
      {/* Admin panel routes (protected) */}
      {isAuthenticated ? (
        <Route path="/">
          <div className="min-h-screen bg-[#f5f5f5]">
            <Navigation onNewPayment={() => setPaymentModalOpen(true)} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/creators">
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-black mb-4">Creator Management</h1>
                    <p className="text-gray-600 mb-6">Manage your creator network and onboarding.</p>
                    <button
                      onClick={() => setCreatorModalOpen(true)}
                      className="bg-[#28ce73] hover:bg-[#22b366] text-white px-6 py-3 rounded-lg font-medium"
                    >
                      Onboard New Creator
                    </button>
                  </div>
                </Route>
                <Route path="/payments">
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-black mb-4">Payment Management</h1>
                    <p className="text-gray-600">Advanced payment processing and bulk operations.</p>
                  </div>
                </Route>
                <Route component={NotFound} />
              </Switch>
            </main>
            
            {/* Modals */}
            <PaymentModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} />
            <CreatorModal open={creatorModalOpen} onOpenChange={setCreatorModalOpen} />
          </div>
        </Route>
      ) : (
        /* Landing page for non-authenticated admin users */
        <Route path="/">
          <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
            <div className="max-w-md w-full mx-4">
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-[#28ce73] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-black mb-4">Creator Payout System</h1>
                <p className="text-gray-600 mb-6">
                  Admin panel for managing creator payments with automated VAT compliance.
                </p>
                <a
                  href="/api/login"
                  className="inline-block bg-[#28ce73] hover:bg-[#22b366] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Admin Login
                </a>
              </div>
            </div>
          </div>
        </Route>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
