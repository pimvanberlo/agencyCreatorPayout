import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Euro, Users, Clock, CheckCircle, Search, Filter, Download, Send } from "lucide-react";
import { formatCurrency } from "@/lib/vat-utils";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  totalPayouts: string;
  activeCreators: number;
  pendingPayments: number;
  successRate: string;
}

interface PaymentWithCreator {
  id: number;
  amount: string;
  vatAmount: string;
  totalAmount: string;
  status: string;
  description: string;
  createdAt: string;
  creator: {
    id: number;
    fullName: string;
    email: string;
    country: string;
  };
}

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<number[]>([]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: paymentRequests = [], isLoading: paymentsLoading } = useQuery<PaymentWithCreator[]>({
    queryKey: ["/api/payment-requests"],
  });

  const filteredPayments = paymentRequests.filter(payment => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch = payment.creator.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.creator.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      claimed: "bg-blue-100 text-blue-800", 
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    const icons = {
      pending: <Clock size={12} className="mr-1" />,
      claimed: <Send size={12} className="mr-1" />,
      paid: <CheckCircle size={12} className="mr-1" />,
      failed: <span className="mr-1">✗</span>,
    };

    return (
      <Badge className={`${variants[status as keyof typeof variants] || variants.pending} capitalize`}>
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayments(filteredPayments.map(p => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleSelectPayment = (paymentId: number, checked: boolean) => {
    if (checked) {
      setSelectedPayments(prev => [...prev, paymentId]);
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId));
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Payment Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage creator payouts and track payment status</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
            <Download className="mr-2" size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Payouts</p>
                <p className="text-2xl font-bold text-black mt-1">
                  {stats ? formatCurrency(parseFloat(stats.totalPayouts)) : "€0.00"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Euro className="text-green-600" size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-green-600">+12.5%</span>
              <span className="text-gray-600 ml-2">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Creators</p>
                <p className="text-2xl font-bold text-black mt-1">{stats?.activeCreators || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600" size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-green-600">+8</span>
              <span className="text-gray-600 ml-2">new this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Payments</p>
                <p className="text-2xl font-bold text-black mt-1">{stats?.pendingPayments || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-black mt-1">{stats?.successRate || "0"}%</p>
              </div>
              <div className="w-12 h-12 bg-[#28ce73]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#28ce73]" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Requests Table */}
      <Card className="border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-black">Recent Payment Requests</h2>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 border-gray-300 focus:ring-[#28ce73] focus:border-transparent"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-gray-600 font-medium">Creator</TableHead>
              <TableHead className="text-gray-600 font-medium">Amount</TableHead>
              <TableHead className="text-gray-600 font-medium">Status</TableHead>
              <TableHead className="text-gray-600 font-medium">Created</TableHead>
              <TableHead className="text-gray-600 font-medium">VAT</TableHead>
              <TableHead className="text-right text-gray-600 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-600">
                  No payment requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedPayments.includes(payment.id)}
                      onCheckedChange={(checked) => handleSelectPayment(payment.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium">
                          {payment.creator.fullName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">{payment.creator.fullName}</div>
                        <div className="text-sm text-gray-600">{payment.creator.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-black">
                      {formatCurrency(parseFloat(payment.totalAmount))}
                    </div>
                    <div className="text-sm text-gray-600">
                      VAT: {formatCurrency(parseFloat(payment.vatAmount))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {payment.creator.country}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#28ce73] hover:text-[#22b366]">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {selectedPayments.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button className="bg-[#28ce73] hover:bg-[#22b366] text-white">
                Process Selected ({selectedPayments.length})
              </Button>
              <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
                Send Reminders
              </Button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Page 1 of {Math.ceil(filteredPayments.length / 10)}</span>
              <Button variant="ghost" size="sm" disabled>
                Previous
              </Button>
              <Button variant="ghost" size="sm">
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
