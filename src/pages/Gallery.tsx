import Navbar from "@/components/Navbar";
import { ImageIcon } from "lucide-react";

export default function Gallery() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <ImageIcon className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Photo Gallery</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse through memories and moments from SVCHS events and reunions
          </p>
        </div>

        <div className="text-center py-12">
          <p className="text-muted-foreground">Gallery feature coming soon! Upload and share your favorite SVCHS memories.</p>
        </div>
      </div>
    </div>
  );
}
