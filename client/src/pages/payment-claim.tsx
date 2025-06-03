import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/vat-utils";
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
  Download
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PaymentClaim() {
  const [match, params] = useRoute("/claim/:token");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: claimData, isLoading, error } = useQuery({
    queryKey: [`/api/claim/${params?.token}`],
    enabled: !!params?.token,
  });

  const claimPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/claim/${params?.token}`);
      return response.json();
    },
    onSuccess: () => {
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

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#28ce73] rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Payment Claim</h1>
          <p className="text-gray-600">Review and claim your payment</p>
        </div>

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
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Creator Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="text-gray-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-black">{creator.fullName}</p>
                    <p className="text-gray-600">{creator.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <MapPin className="mr-2 text-gray-600" size={16} />
                    <span className="text-black">{creator.country}</span>
                  </div>
                  <div className="flex items-center">
                    <Building className="mr-2 text-gray-600" size={16} />
                    <span className="text-black capitalize">{creator.businessType.replace('_', ' ')}</span>
                  </div>
                </div>

                {creator.companyName && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Company</Label>
                    <p className="text-black">{creator.companyName}</p>
                  </div>
                )}

                {creator.vatId && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">VAT ID</Label>
                    <p className="text-black font-mono">{creator.vatId}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Upload/Management */}
            {creator.invoiceMethod === 'manual' && paymentRequest.status === 'pending' && (
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle>Invoice Upload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <FileText className="text-blue-600" size={16} />
                    <AlertDescription className="text-blue-800">
                      Please upload your invoice for this payment. Our AI system will validate 
                      that it matches the payment amount and details.
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT ({paymentRequest.vatRate}%):</span>
                    <span className="text-black font-medium">
                      {formatCurrency(parseFloat(paymentRequest.vatAmount))}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-black">Total Amount:</span>
                    <span className="text-black">
                      {formatCurrency(parseFloat(paymentRequest.totalAmount))}
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
                      Payment completed! The funds have been transferred to your Stripe account.
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
                  If you have questions about this payment or need assistance, 
                  our support team is here to help.
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
