import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, calculateVAT, VAT_RATES } from "@shared/vat-utils";
import { 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  User, 
  Building, 
  MapPin, 
  Calendar,
  Upload,
  FileText,
  Download,
  ArrowRight,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Creator information form schema
const creatorInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  country: z.string().min(1, "Please select a country"),
  businessType: z.enum(["individual", "vat_registered", "vat_exempt"]),
  vatId: z.string().optional(),
  companyName: z.string().optional(),
  invoiceMethod: z.enum(["auto", "manual"]),
}).refine((data) => {
  if (data.businessType === 'vat_registered' && !data.vatId) {
    return false;
  }
  return true;
}, {
  message: "VAT ID is required for VAT registered businesses",
  path: ["vatId"],
});

type CreatorInfoFormData = z.infer<typeof creatorInfoSchema>;

const COUNTRIES = VAT_RATES.map(rate => ({ value: rate.country, label: rate.countryName }));

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual/Freelancer", description: "Personal freelancer or individual" },
  { value: "vat_registered", label: "Company (VAT registered)", description: "Company with valid VAT registration" },
  { value: "vat_exempt", label: "Company (VAT exempt)", description: "Company not subject to VAT" },
];

export default function PaymentClaim() {
  const [match, params] = useRoute("/claim/:token");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'info' | 'claim' | 'complete'>('info');
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfoFormData | null>(null);
  const { toast } = useToast();

  const form = useForm<CreatorInfoFormData>({
    resolver: zodResolver(creatorInfoSchema),
    defaultValues: {
      fullName: "",
      email: "",
      country: "",
      businessType: "individual",
      vatId: "",
      companyName: "",
      invoiceMethod: "auto",
    },
  });

  const { data: claimData, isLoading, error } = useQuery({
    queryKey: [`/api/claim/${params?.token}`],
    enabled: !!params?.token,
  });

  const submitCreatorInfoMutation = useMutation({
    mutationFn: async (data: CreatorInfoFormData) => {
      // Create or update creator with the information
      const response = await apiRequest("POST", "/api/creators", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCreatorInfo(form.getValues());
      setStep('claim');
      toast({
        title: "Information Saved",
        description: "Your information has been saved. You can now proceed with the claim.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const claimPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/claim/${params?.token}`);
      return response.json();
    },
    onSuccess: () => {
      setStep('complete');
      toast({
        title: "Payment Claimed",
        description: "You have successfully claimed this payment. You'll receive it once processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadInvoiceMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('invoice', file);
      const response = await fetch(`/api/payment-requests/${claimData?.paymentRequest.id}/invoice`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to upload invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Uploaded",
        description: "Your invoice has been uploaded and will be validated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!match) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-gray-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-black mb-2">Invalid Link</h1>
            <p className="text-gray-600">This payment claim link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-[#28ce73] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !claimData) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-gray-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-black mb-2">Payment Not Found</h1>
            <p className="text-gray-600">
              This payment request could not be found or has already been processed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { paymentRequest, creator } = claimData;

  // Check if creator already exists - if so, skip info step
  useEffect(() => {
    if (creator && step === 'info') {
      setCreatorInfo({
        fullName: creator.fullName,
        email: creator.email,
        country: creator.country,
        businessType: creator.businessType,
        vatId: creator.vatId || "",
        companyName: creator.companyName || "",
        invoiceMethod: creator.invoiceMethod,
      });
      setStep('claim');
    }
  }, [creator, step]);

  // Calculate VAT based on current form data or existing creator data
  const watchedCountry = form.watch("country");
  const watchedBusinessType = form.watch("businessType");
  const activeCreatorInfo = creatorInfo || (creator ? {
    fullName: creator.fullName,
    email: creator.email,
    country: creator.country,
    businessType: creator.businessType,
    vatId: creator.vatId || "",
    companyName: creator.companyName || "",
    invoiceMethod: creator.invoiceMethod,
  } : null);

  const vatCalculation = activeCreatorInfo 
    ? calculateVAT(parseFloat(paymentRequest.amount), activeCreatorInfo.country, activeCreatorInfo.businessType)
    : watchedCountry && watchedBusinessType
    ? calculateVAT(parseFloat(paymentRequest.amount), watchedCountry, watchedBusinessType)
    : null;

  const totalAmount = vatCalculation 
    ? parseFloat(paymentRequest.amount) + vatCalculation.amount 
    : parseFloat(paymentRequest.amount);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { className: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      claimed: { className: "bg-blue-100 text-blue-800", icon: CheckCircle },
      paid: { className: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { className: "bg-red-100 text-red-800", icon: AlertCircle },
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.className} capitalize`}>
        <Icon size={12} className="mr-1" />
        {status}
      </Badge>
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadInvoiceMutation.mutate(file);
    }
  };

  // Step indicator component
  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[
          { key: 'info', label: 'Your Information', icon: User },
          { key: 'claim', label: 'Claim Payment', icon: CreditCard },
          { key: 'complete', label: 'Complete', icon: CheckCircle }
        ].map((stepItem, index) => {
          const isActive = step === stepItem.key;
          const isCompleted = 
            (stepItem.key === 'info' && (step === 'claim' || step === 'complete')) ||
            (stepItem.key === 'claim' && step === 'complete');
          const Icon = stepItem.icon;
          
          return (
            <div key={stepItem.key} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                isCompleted 
                  ? "bg-[#28ce73] text-white" 
                  : isActive
                  ? "bg-[#28ce73]/20 text-[#28ce73] border-2 border-[#28ce73]"
                  : "bg-gray-200 text-gray-600"
              }`}>
                {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
              </div>
              <span className={`ml-2 font-medium ${
                isActive ? "text-[#28ce73]" : "text-black"
              }`}>
                {stepItem.label}
              </span>
              {index < 2 && <ArrowRight className="w-4 h-4 text-gray-400 mx-4" />}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Creator information step
  if (step === 'info') {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#28ce73] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Claim Your Payment</h1>
            <p className="text-gray-600">Please provide your information to continue</p>
          </div>

          {renderStepIndicator()}

          <Card className="max-w-2xl mx-auto border border-gray-200">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => submitCreatorInfoMutation.mutate(data))} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black">Basic Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Your full name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="your@email.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Location & Business Type */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black">Location & Business</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country.value} value={country.value}>
                                    {country.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="businessType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select business type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {BUSINESS_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div>
                                      <div className="font-medium">{type.label}</div>
                                      <div className="text-sm text-gray-600">{type.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Conditional VAT/Company Information */}
                  {(watchedBusinessType === 'vat_registered' || watchedBusinessType === 'vat_exempt') && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-black">Company Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Your Company B.V." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {watchedBusinessType === 'vat_registered' && (
                          <FormField
                            control={form.control}
                            name="vatId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>VAT ID *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., NL123456789B01" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Invoice Method */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black">Invoice Preference</h3>
                    <FormField
                      control={form.control}
                      name="invoiceMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="space-y-3"
                            >
                              <div className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                                <RadioGroupItem value="auto" id="auto" className="mt-1" />
                                <Label htmlFor="auto" className="ml-4 cursor-pointer">
                                  <div className="font-medium text-black">Auto-generate invoice</div>
                                  <p className="text-sm text-gray-600">
                                    We'll create a professional invoice for you automatically
                                  </p>
                                </Label>
                              </div>
                              <div className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                                <Label htmlFor="manual" className="ml-4 cursor-pointer">
                                  <div className="font-medium text-black">Upload my own invoice</div>
                                  <p className="text-sm text-gray-600">
                                    I'll provide my own PDF invoice (will be validated by AI)
                                  </p>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* VAT Preview */}
                  {vatCalculation && watchedCountry && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="text-blue-600" size={16} />
                      <AlertDescription className="text-blue-800">
                        <strong>VAT Calculation Preview:</strong> {vatCalculation.note}<br />
                        Payment: {formatCurrency(parseFloat(paymentRequest.amount))} + VAT: {formatCurrency(vatCalculation.amount)} = Total: {formatCurrency(totalAmount)}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submitCreatorInfoMutation.isPending}
                      className="bg-[#28ce73] hover:bg-[#22b366] text-white px-8"
                    >
                      {submitCreatorInfoMutation.isPending ? "Saving..." : "Continue"}
                      <ArrowRight className="ml-2" size={16} />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Payment complete step
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-black mb-4">Payment Claimed Successfully!</h1>
            <p className="text-gray-600 mb-6">
              Your payment has been claimed and will be processed. You'll receive the funds once the admin approves the payment.
            </p>
            {activeCreatorInfo?.invoiceMethod === 'manual' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Don't forget to upload your invoice if you haven't already. The payment will be processed once your invoice is validated.
                </p>
              </div>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => window.close()}
                className="w-full bg-[#28ce73] hover:bg-[#22b366] text-white"
              >
                Close Window
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-300 text-black hover:bg-gray-50"
                onClick={() => setStep('claim')}
              >
                View Payment Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default claim step with payment details and invoice upload
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#28ce73] rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Claim Payment</h1>
          <p className="text-gray-600">Review your payment details and submit your claim</p>
        </div>

        {renderStepIndicator()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Details */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Payment Details</span>
                  {getStatusBadge(paymentRequest.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Payment ID</Label>
                    <p className="text-black font-mono">#{paymentRequest.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created</Label>
                    <p className="text-black">
                      {formatDistanceToNow(new Date(paymentRequest.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {paymentRequest.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="text-black">{paymentRequest.description}</p>
                  </div>
                )}

                {paymentRequest.dueDate && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Due Date</Label>
                    <div className="flex items-center text-black">
                      <Calendar className="mr-2" size={16} />
                      {new Date(paymentRequest.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Creator Information */}
            {activeCreatorInfo && (
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="text-gray-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-black">{activeCreatorInfo.fullName}</p>
                      <p className="text-gray-600">{activeCreatorInfo.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <MapPin className="mr-2 text-gray-600" size={16} />
                      <span className="text-black">{COUNTRIES.find(c => c.value === activeCreatorInfo.country)?.label}</span>
                    </div>
                    <div className="flex items-center">
                      <Building className="mr-2 text-gray-600" size={16} />
                      <span className="text-black capitalize">{activeCreatorInfo.businessType.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {activeCreatorInfo.companyName && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Company</Label>
                      <p className="text-black">{activeCreatorInfo.companyName}</p>
                    </div>
                  )}

                  {activeCreatorInfo.vatId && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">VAT ID</Label>
                      <p className="text-black font-mono">{activeCreatorInfo.vatId}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invoice Upload/Management */}
            {activeCreatorInfo?.invoiceMethod === 'manual' && paymentRequest.status === 'pending' && (
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle>Invoice Upload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <FileText className="text-blue-600" size={16} />
                    <AlertDescription className="text-blue-800">
                      Please upload your invoice for this payment. Our AI system will validate that it matches the payment amount and details.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invoice-upload" className="text-sm font-medium text-black">
                        Upload Invoice (PDF only, max 10MB)
                      </Label>
                      <Input
                        id="invoice-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="mt-1 border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                      />
                    </div>

                    {file && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="mr-2 text-gray-600" size={16} />
                          <span className="text-sm text-black">{file.name}</span>
                        </div>
                        <Button
                          onClick={handleUpload}
                          disabled={uploadInvoiceMutation.isPending}
                          size="sm"
                          className="bg-[#28ce73] hover:bg-[#22b366] text-white"
                        >
                          {uploadInvoiceMutation.isPending ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span className="text-black font-medium">
                      {formatCurrency(parseFloat(paymentRequest.amount))}
                    </span>
                  </div>
                  {vatCalculation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">VAT ({vatCalculation.rate}%):</span>
                      <span className="text-black font-medium">
                        {formatCurrency(vatCalculation.amount)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-black">Total Amount:</span>
                    <span className="text-black">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {paymentRequest.status === 'pending' && (
                  <Button
                    onClick={() => claimPaymentMutation.mutate()}
                    disabled={claimPaymentMutation.isPending}
                    className="w-full bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
                    size="lg"
                  >
                    {claimPaymentMutation.isPending ? "Claiming..." : "Claim Payment"}
                  </Button>
                )}

                {paymentRequest.status === 'claimed' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="text-blue-600" size={16} />
                    <AlertDescription className="text-blue-800">
                      Payment claimed successfully. You'll receive it once processed by the admin.
                    </AlertDescription>
                  </Alert>
                )}

                {paymentRequest.status === 'paid' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="text-green-600" size={16} />
                    <AlertDescription className="text-green-800">
                      Payment completed! The funds have been transferred to your account.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  If you have questions about this payment or need assistance, our support team is here to help.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full border-gray-300 text-black hover:bg-gray-50">
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm" className="w-full border-gray-300 text-black hover:bg-gray-50">
                    Download Receipt
                    <Download className="ml-2" size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}