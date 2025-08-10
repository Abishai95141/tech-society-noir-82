
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface MemberFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  community: string;
  onCommunityChange: (value: string) => void;
  canHost: boolean;
  onCanHostChange: (value: boolean) => void;
  hasOpenProjects: boolean;
  onHasOpenProjectsChange: (value: boolean) => void;
  sort: string;
  onSortChange: (value: string) => void;
  resultCount: number;
}

const COMMUNITIES = ["All", "ML", "Intelligent Systems", "Web Dev", "Games & App Dev", "Cyber Security"];

export function MemberFilters({
  search,
  onSearchChange,
  community,
  onCommunityChange,
  canHost,
  onCanHostChange,
  hasOpenProjects,
  onHasOpenProjectsChange,
  sort,
  onSortChange,
  resultCount
}: MemberFiltersProps) {
  const activeFilters = [
    canHost && "Can host events",
    hasOpenProjects && "Has open projects",
    community !== "All" && community
  ].filter(Boolean);

  const clearAllFilters = () => {
    onCommunityChange("All");
    onCanHostChange(false);
    onHasOpenProjectsChange(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or specialization"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
        
        <Select value={community} onValueChange={onCommunityChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Community" />
          </SelectTrigger>
          <SelectContent>
            {COMMUNITIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant={canHost ? "default" : "outline"}
          size="sm"
          onClick={() => onCanHostChange(!canHost)}
        >
          Can host events
        </Button>
        
        <Button
          variant={hasOpenProjects ? "default" : "outline"}
          size="sm"
          onClick={() => onHasOpenProjectsChange(!hasOpenProjects)}
        >
          Has open projects
        </Button>
        
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently joined</SelectItem>
            <SelectItem value="az">A–Z</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="ml-auto text-sm text-muted-foreground">
          {resultCount} result{resultCount === 1 ? '' : 's'}
        </div>
      </div>
      
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map(filter => (
            <Badge key={filter} variant="secondary" className="text-xs">
              {filter}
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
