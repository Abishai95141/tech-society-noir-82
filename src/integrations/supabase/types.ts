export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bootstrap_admins: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      cms_posts: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          created_at: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          added_by: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_rsvp: boolean
          archived: boolean
          capacity: number | null
          community_slug: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          end_at: string | null
          host: string | null
          id: string
          is_featured: boolean
          links: Json | null
          location: string | null
          meeting_link: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          summary: string | null
          tba: boolean
          theme: string | null
          title: string
          updated_at: string
          venue_type: Database["public"]["Enums"]["venue_type"] | null
        }
        Insert: {
          allow_rsvp?: boolean
          archived?: boolean
          capacity?: number | null
          community_slug?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          host?: string | null
          id?: string
          is_featured?: boolean
          links?: Json | null
          location?: string | null
          meeting_link?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          tba?: boolean
          theme?: string | null
          title: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Update: {
          allow_rsvp?: boolean
          archived?: boolean
          capacity?: number | null
          community_slug?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          host?: string | null
          id?: string
          is_featured?: boolean
          links?: Json | null
          location?: string | null
          meeting_link?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          tba?: boolean
          theme?: string | null
          title?: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          project_id: string
          requester_id: string
          status: Database["public"]["Enums"]["join_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          project_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["join_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          project_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["join_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          community_slug: string | null
          created_at: string
          degree: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          must_change_password: boolean
          name: string | null
          phone: string | null
          role: string | null
          specialization: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          community_slug?: string | null
          created_at?: string
          degree?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          must_change_password?: boolean
          name?: string | null
          phone?: string | null
          role?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          community_slug?: string | null
          created_at?: string
          degree?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          must_change_password?: boolean
          name?: string | null
          phone?: string | null
          role?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_community_slug_fkey"
            columns: ["community_slug"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["slug"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean
          community_slug: string | null
          created_at: string
          drive_url: string | null
          featured: boolean
          flagged: boolean
          flagged_note: string | null
          github_url: string | null
          id: string
          looking_for: string | null
          owner_id: string
          status: Database["public"]["Enums"]["project_status"]
          summary: string | null
          tech_stack: string[]
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          community_slug?: string | null
          created_at?: string
          drive_url?: string | null
          featured?: boolean
          flagged?: boolean
          flagged_note?: string | null
          github_url?: string | null
          id?: string
          looking_for?: string | null
          owner_id: string
          status: Database["public"]["Enums"]["project_status"]
          summary?: string | null
          tech_stack?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          community_slug?: string | null
          created_at?: string
          drive_url?: string | null
          featured?: boolean
          flagged?: boolean
          flagged_note?: string | null
          github_url?: string | null
          id?: string
          looking_for?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string | null
          tech_stack?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_community_slug_fkey"
            columns: ["community_slug"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["slug"]
          },
        ]
      }
      role_assignments: {
        Row: {
          community_slug: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          community_slug?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          community_slug?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_community_slug_fkey"
            columns: ["community_slug"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["slug"]
          },
        ]
      }
      tech_buddies: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: Database["public"]["Enums"]["tech_buddy_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["tech_buddy_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["tech_buddy_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_host_events: {
        Args: { _user_id: string }
        Returns: boolean
      }
      compute_event_status: {
        Args: { _start: string; _end: string; _tba: boolean }
        Returns: Database["public"]["Enums"]["event_status"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _community_slug?: string
        }
        Returns: boolean
      }
      is_approved: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "coordinator"
        | "assistant_coordinator"
        | "secretary"
        | "joint_secretary"
        | "member"
      event_status: "PAST" | "LIVE" | "UPCOMING"
      join_status: "PENDING" | "APPROVED" | "REJECTED"
      project_status: "INCUBATION" | "PRODUCTION" | "STARTUP" | "RESEARCH"
      tech_buddy_status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED"
      user_status: "PENDING" | "APPROVED" | "REJECTED"
      venue_type: "ONLINE" | "IN_PERSON" | "HYBRID"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "coordinator",
        "assistant_coordinator",
        "secretary",
        "joint_secretary",
        "member",
      ],
      event_status: ["PAST", "LIVE", "UPCOMING"],
      join_status: ["PENDING", "APPROVED", "REJECTED"],
      project_status: ["INCUBATION", "PRODUCTION", "STARTUP", "RESEARCH"],
      tech_buddy_status: ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"],
      user_status: ["PENDING", "APPROVED", "REJECTED"],
      venue_type: ["ONLINE", "IN_PERSON", "HYBRID"],
    },
  },
} as const
