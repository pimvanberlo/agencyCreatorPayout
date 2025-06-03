import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { VAT_RATES, calculateVAT, formatCurrency } from "@/lib/vat-utils";
import { Info, User, Building, CreditCard } from "lucide-react";

const creatorSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  country: z.string().min(1, "Please select a country"),
  businessType: z.enum(["individual", "vat_registered", "vat_exempt"]),
  vatId: z.string().optional(),
  companyName: z.string().optional(),
  invoiceMethod: z.enum(["auto", "manual"]),
});

type CreatorFormData = z.infer<typeof creatorSchema>;

interface CreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COUNTRIES = [
  { value: "NL", label: "Netherlands" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgium" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "UK", label: "United Kingdom" },
  { value: "US", label: "United States" },
];

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual/Freelancer", description: "Personal freelancer or individual" },
  { value: "vat_registered", label: "Company (VAT registered)", description: "Company with valid VAT registration" },
  { value: "vat_exempt", label: "Company (VAT exempt)", description: "Company not subject to VAT" },
];

export function CreatorModal({ open, onOpenChange }: CreatorModalProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
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

  const createCreatorMutation = useMutation({
    mutationFn: async (data: CreatorFormData) => {
      const response = await apiRequest("POST", "/api/creators", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Creator Created",
        description: "Creator has been successfully onboarded. Stripe account created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onOpenChange(false);
      form.reset();
      setStep(1);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const watchedCountry = form.watch("country");
  const watchedBusinessType = form.watch("businessType");

  const vatPreview = watchedCountry && watchedBusinessType 
    ? calculateVAT(1000, watchedCountry, watchedBusinessType)
    : null;

  const isVatRequired = watchedBusinessType === "vat_registered";

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= stepNumber 
                ? "bg-[#28ce73] text-white" 
                : "bg-gray-200 text-gray-600"
            }`}>
              {stepNumber}
            </div>
            <span className={`ml-2 font-medium ${
              step >= stepNumber ? "text-black" : "text-gray-600"
            }`}>
              {stepNumber === 1 && "Basic Info"}
              {stepNumber === 2 && "VAT Details"}
              {stepNumber === 3 && "Stripe Setup"}
            </span>
            {stepNumber < 3 && <div className="w-12 h-px bg-gray-300 mx-4"></div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-black mb-4">
            Creator Onboarding
          </DialogTitle>
          <p className="text-gray-600 text-center mb-6">
            Get started with our payout system in just a few steps
          </p>
        </DialogHeader>

        {renderStepIndicator()}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createCreatorMutation.mutate(data))} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-black mb-6 flex items-center">
                  <User className="mr-2" size={20} />
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-black">Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your full name"
                            className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                          />
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
                        <FormLabel className="text-sm font-medium text-black">Email Address *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your@email.com"
                            className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-black">Country *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent">
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
                        <FormLabel className="text-sm font-medium text-black">Business Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent">
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BUSINESS_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-black mb-6 flex items-center">
                  <Building className="mr-2" size={20} />
                  VAT Information
                </h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <Info className="text-blue-600 mt-1 mr-3" size={16} />
                    <div>
                      <p className="text-sm font-medium text-blue-800">VAT Calculation</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Our system automatically calculates VAT based on your location and business type. 
                        EU VAT reverse charge applies for eligible businesses.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {isVatRequired && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="vatId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-black">VAT ID Number *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., NL123456789B01"
                                className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                              />
                            </FormControl>
                            <p className="text-xs text-gray-600 mt-1">Required for VAT registered businesses</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-black">Company Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Your Company B.V."
                                className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedBusinessType === "individual" && (
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-black">Business Name (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Your business or trading name"
                              className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {vatPreview && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-black mb-2">VAT Calculation Preview</h4>
                      <p className="text-sm text-gray-700">
                        {vatPreview.note}: {formatCurrency(1000)} base + {formatCurrency(vatPreview.amount)} VAT = {formatCurrency(1000 + vatPreview.amount)} total
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-black mb-6 flex items-center">
                  <CreditCard className="mr-2" size={20} />
                  Invoice Preferences
                </h3>

                <FormField
                  control={form.control}
                  name="invoiceMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-black">How would you like to handle invoices?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <RadioGroupItem value="auto" id="auto" className="mt-1" />
                            <Label htmlFor="auto" className="ml-4 cursor-pointer">
                              <div className="font-medium text-black">Auto-generate invoices</div>
                              <p className="text-sm text-gray-600">
                                We'll create professional invoices for you automatically
                              </p>
                            </Label>
                          </div>
                          
                          <div className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <RadioGroupItem value="manual" id="manual" className="mt-1" />
                            <Label htmlFor="manual" className="ml-4 cursor-pointer">
                              <div className="font-medium text-black">Upload my own invoices</div>
                              <p className="text-sm text-gray-600">
                                I'll provide PDF invoices for each payment (AI validated)
                              </p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Ready to create Stripe account</h4>
                  <p className="text-sm text-green-700">
                    After clicking "Create Account", a Stripe Express account will be created and you'll be redirected to complete the onboarding process.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? () => onOpenChange(false) : handleBack}
                className="border-gray-300 text-black hover:bg-gray-50"
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              
              <div className="space-x-3">
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createCreatorMutation.isPending}
                    className="bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
                  >
                    {createCreatorMutation.isPending ? "Creating Account..." : "Create Stripe Account"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
