export default function Footer() {
  return (
    <footer className="border-t mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-10 grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <h4 className="font-semibold mb-3">About</h4>
          <p className="text-muted-foreground">TechSociety is a grayscale-first community for builders and learners.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Links</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><a className="story-link" href="#">Code of Conduct</a></li>
            <li><a className="story-link" href="#">Contact</a></li>
            <li><a className="story-link" href="#">Privacy</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Social</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><a className="story-link" href="#">GitHub</a></li>
            <li><a className="story-link" href="#">Twitter</a></li>
            <li><a className="story-link" href="#">LinkedIn</a></li>
          </ul>
        </div>
        <div className="text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TechSociety</p>
        </div>
      </div>
    </footer>
  );
}
