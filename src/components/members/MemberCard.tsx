
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface MemberCardProps {
  member: {
    id: string;
    name: string | null;
    specialization: string | null;
    community_slug: string | null;
    role?: string;
    projectCount: number;
    eventCount: number;
    buddyCount: number;
    hasOpenProjects: boolean;
  };
  onClick: () => void;
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  return (
    <Card 
      className="rounded-2xl hover-scale cursor-pointer group transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-sm font-medium">
              {(member.name || 'M').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">
              {member.name || 'Member'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {member.specialization || '—'}
            </p>
          </div>
          <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          {member.community_slug && (
            <Badge variant="secondary" className="text-xs">
              {member.community_slug}
            </Badge>
          )}
          {member.hasOpenProjects && (
            <Badge variant="outline" className="text-xs border-primary text-primary">
              Looking
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-medium">{member.projectCount}</span>
            <span>Projects</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{member.eventCount}</span>
            <span>Events</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{member.buddyCount}</span>
            <span>Buddies</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
