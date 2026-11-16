import { Loader } from "@/components/Loader";
import { Nav } from "@/components/Nav";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Insights } from "@/components/sections/Insights";
import { Methodology } from "@/components/sections/Methodology";
import { RoiDemo } from "@/components/sections/RoiDemo";
import { Solutions } from "@/components/sections/Solutions";
import { Statement } from "@/components/sections/Statement";

export default function Home() {
  return (
    <>
      <Loader />
      <Nav />
      <ScrollIndicator />
      <main id="conteudo">
        <Hero />
        <Statement />
        <Solutions />
        <Methodology />
        <RoiDemo />
        <About />
        <Insights />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
