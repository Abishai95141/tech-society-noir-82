import { supabase } from "@/integrations/supabase/client";

export type TechBuddyRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
  created_at: string;
  updated_at: string;
};

export async function getRelationWith(userId: string, otherId: string) {
  const { data, error } = await supabase
    .from("tech_buddies")
    .select("*")
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`)
    .maybeSingle();
  if (error && error.code !== "PGRST116") console.error(error);
  return data as TechBuddyRow | null;
}

export async function sendBuddyRequest(toUserId: string) {
  const { data: sess } = await supabase.auth.getUser();
  const me = sess.user?.id!;
  return supabase.from("tech_buddies").insert({ requester_id: me, recipient_id: toUserId, status: "PENDING" });
}

export async function acceptBuddyRequest(rowId: string) {
  return supabase.from("tech_buddies").update({ status: "ACCEPTED" }).eq("id", rowId);
}

export async function rejectBuddyRequest(rowId: string) {
  return supabase.from("tech_buddies").update({ status: "REJECTED" }).eq("id", rowId);
}

export async function cancelOutgoingRequest(toUserId: string) {
  const { data: sess } = await supabase.auth.getUser();
  const me = sess.user?.id!;
  return supabase
    .from("tech_buddies")
    .delete()
    .eq("requester_id", me)
    .eq("recipient_id", toUserId)
    .eq("status", "PENDING");
}

export async function removeBuddy(otherId: string) {
  const { data: sess } = await supabase.auth.getUser();
  const me = sess.user?.id!;
  return supabase
    .from("tech_buddies")
    .delete()
    .or(`and(requester_id.eq.${me},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${me})`)
    .eq("status", "ACCEPTED");
}

export async function countAcceptedBuddies(userId: string) {
  const { count } = await supabase
    .from("tech_buddies")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq("status", "ACCEPTED");
  return count ?? 0;
}
