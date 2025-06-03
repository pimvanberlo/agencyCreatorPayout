import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Bell, User } from "lucide-react";

interface NavigationProps {
  onNewPayment: () => void;
}

export function Navigation({ onNewPayment }: NavigationProps) {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#28ce73] rounded flex items-center justify-center">
                <CreditCard className="text-white" size={16} />
              </div>
              <span className="text-xl font-semibold text-black">Creator Payout System</span>
            </div>
            <div className="hidden md:flex space-x-6">
              <Link href="/">
                <a className={`pb-4 font-medium ${
                  isActive("/") 
                    ? "text-black border-b-2 border-[#28ce73]" 
                    : "text-gray-600 hover:text-black"
                }`}>
                  Dashboard
                </a>
              </Link>
              <Link href="/creators">
                <a className={`pb-4 font-medium ${
                  isActive("/creators") 
                    ? "text-black border-b-2 border-[#28ce73]" 
                    : "text-gray-600 hover:text-black"
                }`}>
                  Creators
                </a>
              </Link>
              <Link href="/payments">
                <a className={`pb-4 font-medium ${
                  isActive("/payments") 
                    ? "text-black border-b-2 border-[#28ce73]" 
                    : "text-gray-600 hover:text-black"
                }`}>
                  Payments
                </a>
              </Link>
              <Link href="/onboarding">
                <a className={`pb-4 font-medium ${
                  isActive("/onboarding") 
                    ? "text-black border-b-2 border-[#28ce73]" 
                    : "text-gray-600 hover:text-black"
                }`}>
                  Onboarding
                </a>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={onNewPayment}
              className="bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
            >
              <Plus className="mr-2" size={16} />
              New Payment
            </Button>
            <Button variant="ghost" size="sm">
              <Bell size={16} />
            </Button>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User size={16} className="text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
