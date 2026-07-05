import Hero from "@/components/Hero";
import HowToBuildStory from "@/components/home/HowToBuildStory";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import FeaturedContent from "@/components/home/FeaturedContent";
import Footer from "@/components/Footer";
import { getDistilleries } from "@/lib/data";

export default async function HomePage() {
  const distilleries = await getDistilleries();

  return (
    <>
      <Hero />
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} />
      <Footer />
    </>
  );
}
