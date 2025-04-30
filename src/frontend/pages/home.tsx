import { Header } from '../components/header';
import { Hero } from '../components/hero';
import { Features } from '../components/features';
import { HowItWorks } from '../components/how-it-works';
import { BoosterStats } from '../components/boosters';
import { Footer } from '../components/footer';

export function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <BoosterStats />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
} 