import { Cursor } from "@/components/Cursor";
import { Loader } from "@/components/Loader";
import { Nav } from "@/components/Nav";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Split } from "@/components/sections/Split";
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
      <SmoothScroll />
      <Loader />
      <Nav />
      <ScrollIndicator />
      <Cursor />
      <main id="conteudo">
        <Hero />
        <Statement />
        <Solutions />
        <Methodology />
        <RoiDemo />
        <About />
        <Split />
        <Insights />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
