import { useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, MapPin, Building2, ChevronRight } from "lucide-react";
import { Shell } from "@/components/layout/Shell";

function statusStyle(status: string) {
  if (status === 'active') return 'border-green-500/50 text-green-400 bg-green-500/10';
  if (status === 'inactive') return 'border-red-500/50 text-red-400 bg-red-500/10';
  return 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10';
}

export default function BusinessList() {
  const [, setLocation] = useLocation();
  const { data: businesses, isLoading } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });

  return (
    <Shell>
      <div className="p-4 md:p-8 space-y-4 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight uppercase">Global Network</h1>
          <p className="text-muted-foreground text-sm mt-1">Command and monitor all deployed business nodes.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : businesses?.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground font-mono text-sm">
            No business nodes registered in the network.
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block rounded-xl overflow-hidden border border-primary/20 bg-black/40 backdrop-blur-md">
              <table className="w-full">
                <thead className="bg-black/60">
                  <tr className="border-b border-primary/20">
                    <th className="text-left px-6 py-3 text-primary font-mono uppercase text-xs">Node Identifier</th>
                    <th className="text-left px-6 py-3 text-primary font-mono uppercase text-xs">Location</th>
                    <th className="text-left px-6 py-3 text-primary font-mono uppercase text-xs">Sector</th>
                    <th className="text-right px-6 py-3 text-primary font-mono uppercase text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {businesses?.map((business) => (
                    <tr
                      key={business.id}
                      className="hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/businesses/${business.id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-white text-sm">{business.name}</td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{business.city}, {business.country}</td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{business.industry}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant="outline" className={statusStyle(business.status)}>
                          {business.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="md:hidden divide-y divide-primary/10 rounded-xl overflow-hidden border border-primary/20 bg-black/40 backdrop-blur-md">
              {businesses?.map((business) => (
                <button
                  key={business.id}
                  className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-primary/5 active:bg-primary/10 transition-colors"
                  onClick={() => setLocation(`/businesses/${business.id}`)}
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    business.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                    business.status === 'inactive' ? 'bg-red-400' : 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="text-white font-mono text-sm font-medium truncate">{business.name}</div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{business.city}, {business.country}</span>
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{business.industry}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${statusStyle(business.status)}`}>
                      {business.status.toUpperCase()}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
