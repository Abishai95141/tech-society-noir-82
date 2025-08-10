
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberCard } from "@/components/members/MemberCard";
import { MemberQuickView } from "@/components/members/MemberQuickView";
import { MemberFilters } from "@/components/members/MemberFilters";
import { useDebounce } from "@/hooks/use-debounce";

interface Member {
  id: string;
  name: string | null;
  specialization: string | null;
  community_slug: string | null;
  role?: string;
  linkedin_url?: string | null;
  github_url?: string | null;
  phone?: string | null;
  projectCount: number;
  eventCount: number;
  buddyCount: number;
  hasOpenProjects: boolean;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [community, setCommunity] = useState("All");
  const [canHost, setCanHost] = useState(false);
  const [hasOpenProjects, setHasOpenProjects] = useState(false);
  const [sort, setSort] = useState("recent");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 12;

  const fetchMembers = async (reset = false) => {
    setLoading(true);
    try {
      console.log('Fetching members...');
      
      let query = supabase
        .from('profiles')
        .select(`
          id, name, specialization, community_slug, linkedin_url, github_url, phone
        `)
        .eq('status', 'APPROVED')
        .range(reset ? 0 : page * pageSize, reset ? pageSize - 1 : (page + 1) * pageSize - 1);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,specialization.ilike.%${debouncedSearch}%`);
      }

      // Apply community filter
      if (community !== 'All') {
        query = query.eq('community_slug', community);
      }

      // Apply sort
      if (sort === 'az') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching members:', error);
        throw error;
      }

      console.log('Raw data:', data);

      if (!data) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Process the data to include counts and role information
      const processedMembers = await Promise.all(
        data.map(async (member: any) => {
          // Get counts in parallel
          const [roleQuery, projectsQuery, eventsQuery, openProjectsQuery, buddiesQuery] = await Promise.all([
            // Get role
            supabase
              .from('profiles')
              .select('*')
              .eq('id', member.id)
              .single(),
            // Get project count
            supabase
              .from('projects')
              .select('id', { count: 'exact' })
              .eq('owner_id', member.id),
            // Get events count (where user created events)
            supabase
              .from('events')
              .select('id', { count: 'exact' })
              .eq('created_by', member.id),
            // Check for open projects
            supabase
              .from('projects')
              .select('id')
              .eq('owner_id', member.id)
              .not('looking_for', 'is', null)
              .limit(1),
            // Get buddy count (both directions)
            supabase
              .from('tech_buddies')
              .select('id', { count: 'exact' })
              .or(`requester_id.eq.${member.id},recipient_id.eq.${member.id}`)
              .eq('status', 'ACCEPTED')
          ]);

          const userRole = (roleQuery.data as any)?.role || 'member';
          const projectCount = projectsQuery.count || 0;
          const eventCount = eventsQuery.count || 0;
          const buddyCount = buddiesQuery.count || 0;
          const hasOpenProjectsFlag = (openProjectsQuery.data?.length || 0) > 0;

          return {
            id: member.id,
            name: member.name,
            specialization: member.specialization,
            community_slug: member.community_slug,
            role: userRole,
            linkedin_url: member.linkedin_url,
            github_url: member.github_url,
            phone: member.phone,
            projectCount,
            eventCount,
            buddyCount,
            hasOpenProjects: hasOpenProjectsFlag
          };
        })
      );

      console.log('Processed members:', processedMembers);

      // Apply filters after processing
      let filteredMembers = processedMembers;
      
      if (canHost) {
        const hostRoles = ['secretary', 'joint_secretary', 'admin'];
        filteredMembers = filteredMembers.filter(m => hostRoles.includes(m.role || 'member'));
        console.log('After host filter:', filteredMembers);
      }
      
      if (hasOpenProjects) {
        filteredMembers = filteredMembers.filter(m => m.hasOpenProjects);
        console.log('After open projects filter:', filteredMembers);
      }

      console.log('Final filtered members:', filteredMembers);

      setMembers(reset ? filteredMembers : [...members, ...filteredMembers]);
      setHasMore(filteredMembers.length === pageSize);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Members • TechSociety";
  }, []);

  useEffect(() => {
    console.log('Filters changed, resetting...');
    setPage(0);
    setMembers([]);
    fetchMembers(true);
  }, [debouncedSearch, community, canHost, hasOpenProjects, sort]);

  const loadMore = () => {
    setPage(p => p + 1);
    fetchMembers(false);
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setQuickViewOpen(true);
  };

  const renderSkeletons = () => (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl border p-6">
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </>
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-6">Members Directory</h1>
      
      <MemberFilters
        search={search}
        onSearchChange={setSearch}
        community={community}
        onCommunityChange={setCommunity}
        canHost={canHost}
        onCanHostChange={setCanHost}
        hasOpenProjects={hasOpenProjects}
        onHasOpenProjectsChange={setHasOpenProjects}
        sort={sort}
        onSortChange={setSort}
        resultCount={members.length}
      />
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onClick={() => handleMemberClick(member)}
          />
        ))}
        {loading && renderSkeletons()}
      </div>
      
      {!loading && members.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p>No members found matching your criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters or search terms.</p>
        </div>
      )}
      
      {hasMore && !loading && members.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button variant="secondary" onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
      
      {selectedMember && (
        <MemberQuickView
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          member={selectedMember}
        />
      )}
    </main>
  );
}
