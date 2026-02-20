import HeroSection from "@/components/HeroSection";
import TransactionFeed from "@/components/TransactionFeed";
import ShellDetector from "@/components/ShellDetector";
import ZoneHeatmap from "@/components/ZoneHeatmap";
import CorruptionDropbox from "@/components/CorruptionDropbox";
import { Eye } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-text-bright text-sm tracking-tight">VICE<span className="text-primary">EYE</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">
            <a href="#feed" className="hover:text-primary transition-colors">Feed</a>
            <a href="#shells" className="hover:text-primary transition-colors">Shells</a>
            <a href="#zones" className="hover:text-primary transition-colors">Zones</a>
            <a href="#dropbox" className="hover:text-primary transition-colors">Dropbox</a>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        <HeroSection />
        <div id="feed"><TransactionFeed /></div>
        <div id="shells"><ShellDetector /></div>
        <div id="zones"><ZoneHeatmap /></div>
        <div id="dropbox"><CorruptionDropbox /></div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-display">VICEEYE v1.0 — Vice City Intelligence</span>
          <span>All data is simulated for demonstration purposes</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
