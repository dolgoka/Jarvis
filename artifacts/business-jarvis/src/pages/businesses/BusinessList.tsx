import { useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/layout/Shell";

export default function BusinessList() {
  const [, setLocation] = useLocation();
  const { data: businesses, isLoading } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() }});

  return (
    <Shell>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-light text-white tracking-tight uppercase">Global Network</h1>
            <p className="text-muted-foreground mt-1">Command and monitor all deployed business nodes.</p>
          </div>
        </div>

        <Card className="bg-black/40 border-primary/20 backdrop-blur-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-black/60">
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="text-primary font-mono uppercase text-xs">Node Identifier</TableHead>
                  <TableHead className="text-primary font-mono uppercase text-xs">Location</TableHead>
                  <TableHead className="text-primary font-mono uppercase text-xs">Sector</TableHead>
                  <TableHead className="text-primary font-mono uppercase text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : businesses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      No business nodes registered in the network.
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses?.map((business) => (
                    <TableRow 
                      key={business.id} 
                      className="border-primary/10 hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/businesses/${business.id}`)}
                    >
                      <TableCell className="font-mono text-white">{business.name}</TableCell>
                      <TableCell className="text-muted-foreground">{business.city}, {business.country}</TableCell>
                      <TableCell className="text-muted-foreground">{business.industry}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant="outline" 
                          className={`
                            ${business.status === 'active' ? 'border-green-500/50 text-green-400 bg-green-500/10' : ''}
                            ${business.status === 'inactive' ? 'border-red-500/50 text-red-400 bg-red-500/10' : ''}
                            ${business.status === 'pending' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : ''}
                          `}
                        >
                          {business.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
