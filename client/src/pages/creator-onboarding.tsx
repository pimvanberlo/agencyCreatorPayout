import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ExternalLink, Users, CreditCard, FileText, Globe, ArrowRight, Building, MapPin } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VAT_RATES } from "@shared/vat-utils";

const businessDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  businessType: z.enum(["individual", "vat_registered", "vat_exempt"], {
    required_error: "Please select your business type",
  }),
  country: z.string().min(1, "Country is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  vatNumber: z.string().optional(),
  invoiceMethod: z.enum(["upload", "generate"], {
    required_error: "Please select an invoice method",
  }),
}).refine((data) => {
  if (data.businessType === 'vat_registered' && !data.vatNumber) {
    return false;
  }
  return true;
}, {
  message: "VAT number is required for VAT registered businesses",
  path: ["vatNumber"],
});

type BusinessDetailsFormData = z.infer<typeof businessDetailsSchema>;

export default function CreatorOnboarding() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const success = urlParams.get('success');
  const refresh = urlParams.get('refresh');
  const creatorId = urlParams.get('creator');
  const token = urlParams.get('token');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BusinessDetailsFormData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      companyName: "",
      businessType: "individual",
      country: "",
      address: "",
      city: "",
      postalCode: "",
      vatNumber: "",
      invoiceMethod: "generate",
    },
  });

  // Check if creator exists and load their data
  const { data: creator } = useQuery({
    queryKey: [`/api/creators/${creatorId}`],
    enabled: !!creatorId,
  });

  useEffect(() => {
    if (creator && creator.companyName) {
      // If creator already has business details, skip to Stripe setup
      setCurrentStep(2);
    }
  }, [creator]);

  const updateCreatorMutation = useMutation({
    mutationFn: async (data: BusinessDetailsFormData) => {
      const response = await apiRequest("PATCH", `/api/creators/${creatorId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Business details saved",
        description: "Your information has been saved successfully.",
      });
      setCurrentStep(2);
      queryClient.invalidateQueries({ queryKey: [`/api/creators/${creatorId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save business details",
        variant: "destructive",
      });
    },
  });

  const onSubmitBusinessDetails = (data: BusinessDetailsFormData) => {
    if (!creatorId) {
      toast({
        title: "Error",
        description: "Creator ID is missing from the URL",
        variant: "destructive",
      });
      return;
    }
    updateCreatorMutation.mutate(data);
  };

  const features = [
    {
      icon: <Users className="text-[#28ce73]" size={24} />,
      title: "Global Creator Network",
      description: "Join creators from over 30 countries receiving fast, reliable payouts."
    },
    {
      icon: <CreditCard className="text-[#28ce73]" size={24} />,
      title: "Instant Stripe Integration",
      description: "Secure payments powered by Stripe with automated account creation."
    },
    {
      icon: <FileText className="text-[#28ce73]" size={24} />,
      title: "Smart Invoice Handling",
      description: "AI-powered invoice validation or auto-generated professional invoices."
    },
    {
      icon: <Globe className="text-[#28ce73]" size={24} />,
      title: "VAT Compliance",
      description: "Automatic VAT calculation for EU and international payments."
    }
  ];

  const steps = [
    {
      number: 1,
      title: "Business Details",
      description: "Provide your company information and VAT details",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "completed" : "pending"
    },
    {
      number: 2,
      title: "Stripe Account",
      description: "Create your secure payment account",
      status: currentStep === 2 ? "current" : success ? "completed" : "pending"
    },
    {
      number: 3,
      title: "Ready to Receive",
      description: "Start receiving payments from your clients",
      status: success ? "current" : "pending"
    }
  ];

  // If no creator ID is provided, show the "Start Onboarding Process" button with proper handler
  if (!creatorId) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-[#28ce73] rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-black mb-4">Creator Payout System</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of creators receiving fast, secure payments with automated VAT compliance 
              and professional invoice management.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-[#28ce73]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-black mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Progress Steps */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-black">Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${step.status === 'completed' 
                        ? 'bg-[#28ce73] text-white' 
                        : step.status === 'current'
                        ? 'bg-[#28ce73]/20 text-[#28ce73] border-2 border-[#28ce73]'
                        : 'bg-gray-200 text-gray-600'
                      }`}>
                      {step.status === 'completed' ? <CheckCircle size={16} /> : step.number}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        step.status === 'current' ? 'text-[#28ce73]' : 'text-black'
                      }`}>
                        {step.title}
                      </h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-black">No Account Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Get started immediately without creating an account. We'll guide you through the process 
                  and only require the information needed for payments.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                    <span className="text-black">Secure Stripe integration</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                    <span className="text-black">Automatic VAT calculation</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                    <span className="text-black">AI-powered invoice validation</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                    <span className="text-black">Multi-currency support</span>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="text-blue-600" size={16} />
                  <AlertDescription className="text-blue-800">
                    <strong>Pro tip:</strong> Have your business details and VAT information ready 
                    to complete the process in under 5 minutes.
                  </AlertDescription>
                </Alert>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="text-yellow-600" size={16} />
                  <AlertDescription className="text-yellow-800">
                    <strong>Note:</strong> This is a demo page. To start actual onboarding, you need a valid creator link from your client.
                  </AlertDescription>
                </Alert>

                <Button 
                  className="w-full bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
                  size="lg"
                  disabled
                >
                  Start Onboarding Process
                  <ExternalLink className="ml-2" size={16} />
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Support Section */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold text-black mb-4">Need Help?</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our support team is here to help you through the onboarding process. 
              Contact us if you have any questions about VAT requirements, payment processing, or account setup.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
                Contact Support
              </Button>
              <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
                View FAQ
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-black mb-4">Onboarding Complete!</h1>
            <p className="text-gray-600 mb-6">
              Your Stripe account has been successfully created and verified. You can now receive payments 
              from clients through our platform.
            </p>
            <div className="bg-[#28ce73]/10 border border-[#28ce73]/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-black">
                <strong>Next steps:</strong> You'll receive an email with your creator dashboard access 
                and payment claim instructions.
              </p>
            </div>
            <Button 
              className="bg-[#28ce73] hover:bg-[#22b366] text-white"
              onClick={() => window.close()}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (refresh) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-yellow-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-black mb-4">Continue Your Setup</h1>
            <p className="text-gray-600 mb-6">
              Your Stripe account setup was interrupted. Click below to continue where you left off.
            </p>
            <Button 
              className="bg-[#28ce73] hover:bg-[#22b366] text-white"
              onClick={() => window.location.reload()}
            >
              Continue Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-[#28ce73] rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-black mb-4">Creator Payout System</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of creators receiving fast, secure payments with automated VAT compliance 
            and professional invoice management.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-[#28ce73]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-black mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Onboarding Steps */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-black">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {steps.map((step) => (
                <div key={step.number} className="flex items-start space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step.status === 'completed' 
                      ? 'bg-[#28ce73] text-white' 
                      : step.status === 'current'
                      ? 'bg-[#28ce73]/20 text-[#28ce73] border-2 border-[#28ce73]'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.status === 'completed' ? <CheckCircle size={16} /> : step.number}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      step.status === 'current' ? 'text-[#28ce73]' : 'text-black'
                    }`}>
                      {step.title}
                    </h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTA Card */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-black">No Account Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Get started immediately without creating an account. We'll guide you through the process 
                and only require the information needed for payments.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                  <span className="text-black">Secure Stripe integration</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                  <span className="text-black">Automatic VAT calculation</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                  <span className="text-black">AI-powered invoice validation</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="text-[#28ce73] mr-2" size={16} />
                  <span className="text-black">Multi-currency support</span>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="text-blue-600" size={16} />
                <AlertDescription className="text-blue-800">
                  <strong>Pro tip:</strong> Have your business details and VAT information ready 
                  to complete the process in under 5 minutes.
                </AlertDescription>
              </Alert>

              <Button 
                className="w-full bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
                size="lg"
              >
                Start Onboarding Process
                <ExternalLink className="ml-2" size={16} />
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold text-black mb-4">Need Help?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our support team is here to help you through the onboarding process. 
            Contact us if you have any questions about VAT requirements, payment processing, or account setup.
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
              Contact Support
            </Button>
            <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
              View FAQ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
