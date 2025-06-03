import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Copy, Check, ExternalLink } from "lucide-react";

const creatorSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

type CreatorFormData = z.infer<typeof creatorSchema>;

interface CreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatorModal({ open, onOpenChange }: CreatorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  const createCreatorMutation = useMutation({
    mutationFn: async (data: CreatorFormData) => {
      const response = await apiRequest("POST", "/api/creators/quick-create", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOnboardingLink(data.onboardingUrl);
      toast({
        title: "Creator Created",
        description: "Creator created successfully. Send them the onboarding link to complete their profile.",
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

  const handleCopyLink = async () => {
    if (onboardingLink) {
      await navigator.clipboard.writeText(onboardingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link Copied",
        description: "Onboarding link copied to clipboard",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    setOnboardingLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#28ce73]" />
            Add New Creator
          </DialogTitle>
        </DialogHeader>

        {!onboardingLink ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Enter the creator's basic information. They'll receive an onboarding link to complete their business details and preferences.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createCreatorMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Creator's full name" />
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
                        <Input {...field} type="email" placeholder="creator@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCreatorMutation.isPending}
                    className="bg-[#28ce73] hover:bg-[#22b366] text-white"
                  >
                    {createCreatorMutation.isPending ? "Creating..." : "Create Creator"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Creator created successfully! Send them this onboarding link to complete their profile.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Onboarding Link</label>
              <div className="flex items-center space-x-2">
                <Input
                  value={onboardingLink}
                  readOnly
                  className="font-mono text-sm bg-gray-50 border-gray-300"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Send this link to the creator via email</li>
                <li>• They'll complete their business information and VAT details</li>
                <li>• You can create payment requests for them immediately</li>
                <li>• VAT will be calculated automatically based on their selections</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(onboardingLink, '_blank')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Link
              </Button>
              <Button
                onClick={handleClose}
                className="bg-[#28ce73] hover:bg-[#22b366] text-white"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}