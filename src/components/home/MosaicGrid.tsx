import FeaturedProjectsCarousel from "./FeaturedProjectsCarousel";
import UpcomingEventsTile from "./UpcomingEventsTile";
import MemberSpotlightsTile from "./MemberSpotlightsTile";
import LearningResourcesTile from "./LearningResourcesTile";
import OpenCollaborationsTile from "./OpenCollaborationsTile";
import RecentAnnouncementTile from "./RecentAnnouncementTile";

export default function MosaicGrid() {
  return (
    <section className="py-16 border-t">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <FeaturedProjectsCarousel />
          <UpcomingEventsTile />
          <MemberSpotlightsTile />
          <LearningResourcesTile />
          <OpenCollaborationsTile />
          <RecentAnnouncementTile />
        </div>
      </div>
    </section>
  );
}
