import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCreateBusiness } from "@workspace/api-client-react";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { useLocation } from "wouter";

const connectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  industry: z.string().min(1, "Industry is required"),
  managerName: z.string().min(1, "Manager name is required"),
  managerEmail: z.string().email("Invalid email"),
  description: z.string().optional(),
});

type ConnectFormData = z.infer<typeof connectSchema>;

export default function ConnectBusiness() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createBusiness = useCreateBusiness();

  const { register, handleSubmit, formState: { errors } } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      name: "",
      city: "",
      country: "",
      lat: 0,
      lng: 0,
      industry: "",
      managerName: "",
      managerEmail: "",
      description: "",
    }
  });

  const onSubmit = (data: ConnectFormData) => {
    createBusiness.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "UPLINK ESTABLISHED",
          description: "Node successfully registered to the network.",
          variant: "default",
        });
        setLocation("/businesses");
      },
      onError: () => {
        toast({
          title: "UPLINK FAILED",
          description: "Failed to establish connection to node.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Shell>
      <div className="p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight uppercase flex items-center gap-3">
            <LinkIcon className="w-8 h-8 text-primary" />
            Establish Node Uplink
          </h1>
          <p className="text-muted-foreground mt-1">Register a new business node to the global command network.</p>
        </div>

        <Card className="bg-black/60 border-primary/30 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase">Node Configuration</CardTitle>
            <CardDescription className="text-muted-foreground">Input telemetry data for the new operation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Node Designation</Label>
                  <Input {...register("name")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white" placeholder="Business Name" />
                  {errors.name && <p className="text-destructive text-xs font-mono">{errors.name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Sector</Label>
                  <Input {...register("industry")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white" placeholder="Industry" />
                  {errors.industry && <p className="text-destructive text-xs font-mono">{errors.industry.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">City</Label>
                  <Input {...register("city")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white" placeholder="City" />
                  {errors.city && <p className="text-destructive text-xs font-mono">{errors.city.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Country</Label>
                  <Input {...register("country")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white" placeholder="Country" />
                  {errors.country && <p className="text-destructive text-xs font-mono">{errors.country.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Latitude</Label>
                  <Input type="number" step="any" {...register("lat")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white font-mono" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Longitude</Label>
                  <Input type="number" step="any" {...register("lng")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/10">
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Commander Designation</Label>
                  <Input {...register("managerName")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white" placeholder="Manager Name" />
                  {errors.managerName && <p className="text-destructive text-xs font-mono">{errors.managerName.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-primary/70 font-mono text-xs uppercase">Comms Channel</Label>
                  <Input type="email" {...register("managerEmail")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white" placeholder="manager@example.com" />
                  {errors.managerEmail && <p className="text-destructive text-xs font-mono">{errors.managerEmail.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-primary/70 font-mono text-xs uppercase">Parameters / Notes</Label>
                <Textarea {...register("description")} className="bg-black/40 border-primary/20 focus-visible:ring-primary text-white min-h-[100px]" placeholder="Additional node parameters..." />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black font-mono tracking-widest transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
                disabled={createBusiness.isPending}
              >
                {createBusiness.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> INITIATING UPLINK...</>
                ) : (
                  "INITIALIZE NODE"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
