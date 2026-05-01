import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Receipt, CreditCard } from 'lucide-react';

export default function BillingPage() {
  const [bills] = useState([
    { id: '1', billNo: 'BILL-00001', patientName: 'John Doe', billType: 'OPD', amount: 250.00, paid: 250.00, balance: 0, status: 'Paid', date: '2025-12-05' }
  ]);

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Payments</h1>
          <p className="text-slate-600">Manage patient billing and revenue cycle</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />New Bill</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Today Revenue: $12,450', 'Pending: $3,200', 'Collected: $9,250', 'Refunds: $150'].map((stat, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">{stat.split(':')[0]}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.split(':')[1]}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Bills</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {['Bill No', 'Patient', 'Type', 'Amount', 'Paid', 'Balance', 'Status', 'Date', 'Actions'].map(h => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.billNo}</TableCell>
                  <TableCell>{bill.patientName}</TableCell>
                  <TableCell><Badge variant="outline">{bill.billType}</Badge></TableCell>
                  <TableCell>${bill.amount}</TableCell>
                  <TableCell>${bill.paid}</TableCell>
                  <TableCell className={bill.balance > 0 ? 'text-red-600' : 'text-green-600'}>${bill.balance}</TableCell>
                  <TableCell><Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'}>{bill.status}</Badge></TableCell>
                  <TableCell>{bill.date}</TableCell>
                  <TableCell><div className="flex gap-2"><Button size="sm" variant="outline"><Receipt className="w-4 h-4" /></Button><Button size="sm"><CreditCard className="w-4 h-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
