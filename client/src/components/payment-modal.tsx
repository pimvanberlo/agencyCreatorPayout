import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateVAT, formatCurrency } from "@/lib/vat-utils";
import { CheckCircle, X } from "lucide-react";

const paymentSchema = z.object({
  creatorId: z.string().min(1, "Please select a creator"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const [selectedCreatorInfo, setSelectedCreatorInfo] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      creatorId: "",
      amount: "",
      description: "",
      dueDate: "",
    },
  });

  const { data: creators = [] } = useQuery({
    queryKey: ["/api/creators"],
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest("POST", "/api/payment-requests", {
        creatorId: parseInt(data.creatorId),
        amount: data.amount,
        description: data.description,
        dueDate: data.dueDate || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Created",
        description: "Payment request has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onOpenChange(false);
      form.reset();
      setSelectedCreatorInfo(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatorSelect = (creatorId: string) => {
    const creator = creators.find((c: any) => c.id.toString() === creatorId);
    setSelectedCreatorInfo(creator);
    form.setValue("creatorId", creatorId);
  };

  const watchedAmount = form.watch("amount");
  const vatCalculation = selectedCreatorInfo && watchedAmount 
    ? calculateVAT(parseFloat(watchedAmount) || 0, selectedCreatorInfo.country, selectedCreatorInfo.businessType)
    : null;

  const totalAmount = watchedAmount && vatCalculation 
    ? parseFloat(watchedAmount) + vatCalculation.amount 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-black">Create New Payment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createPaymentMutation.mutate(data))} className="space-y-6">
            <FormField
              control={form.control}
              name="creatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Select Creator *</FormLabel>
                  <Select onValueChange={handleCreatorSelect} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent">
                        <SelectValue placeholder="Search and select a creator..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {creators.map((creator: any) => (
                        <SelectItem key={creator.id} value={creator.id.toString()}>
                          {creator.fullName} ({creator.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-black">Payment Amount (EUR) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-600">€</span>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8 border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-black">Due Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Payment description or project details..."
                      className="border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCreatorInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <CheckCircle className="text-green-600 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-green-800">Creator Stripe Account Status</p>
                    <p className="text-sm text-green-700">
                      {selectedCreatorInfo.chargesEnabled ? "✓" : "✗"} Charges enabled{" "}
                      {selectedCreatorInfo.payoutsEnabled ? "✓" : "✗"} Payouts enabled
                    </p>
                  </div>
                </div>
              </div>
            )}

            {vatCalculation && watchedAmount && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-black mb-3">Payment Calculation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span className="text-black">{formatCurrency(parseFloat(watchedAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT ({vatCalculation.note}):</span>
                    <span className="text-black">{formatCurrency(vatCalculation.amount)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span className="text-black">Total Amount:</span>
                    <span className="text-black">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-300 text-black hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaymentMutation.isPending}
                className="bg-[#28ce73] hover:bg-[#22b366] text-white font-medium"
              >
                {createPaymentMutation.isPending ? "Creating..." : "Create Payment Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
