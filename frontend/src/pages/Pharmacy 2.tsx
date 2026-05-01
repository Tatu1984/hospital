import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pill } from 'lucide-react';

export default function Pharmacy() {
  const [drugs] = useState([
    { id: '1', drugName: 'Paracetamol 500mg', category: 'Analgesic', stock: 5000, reorderLevel: 1000, expiry: '2026-12-31', price: 2.50 }
  ]);

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pharmacy Management</h1>
          <p className="text-slate-600">Drug inventory, dispensing, and stock control</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Plus className="w-4 h-4 mr-2" />Add Drug</Button>
          <Button><Pill className="w-4 h-4 mr-2" />Dispense</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['Total Items: 1,245', 'Low Stock: 34', 'Expired: 8', 'Narcotics: 156', 'Orders Today: 89'].map((stat, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">{stat.split(':')[0]}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.split(':')[1]}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Drug Inventory</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search drugs..." className="pl-10 w-80" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Drugs</TabsTrigger>
              <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
              <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
              <TabsTrigger value="narcotics">Narcotics</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Drug Name', 'Category', 'Stock', 'Reorder Level', 'Expiry', 'Price', 'Status'].map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drugs.map((drug) => (
                    <TableRow key={drug.id}>
                      <TableCell className="font-medium">{drug.drugName}</TableCell>
                      <TableCell>{drug.category}</TableCell>
                      <TableCell>{drug.stock}</TableCell>
                      <TableCell>{drug.reorderLevel}</TableCell>
                      <TableCell>{drug.expiry}</TableCell>
                      <TableCell>${drug.price}</TableCell>
                      <TableCell><Badge variant={drug.stock > drug.reorderLevel ? 'default' : 'destructive'}>{drug.stock > drug.reorderLevel ? 'In Stock' : 'Low Stock'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
