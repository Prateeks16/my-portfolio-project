import React from 'react';
import Navbar from '/src/components/Navbar.jsx';
import Hero from '/src/components/Hero.jsx';
import Work from './components/Work';
import Experience from '/src/components/Experience'; 
import Achievements from '/src/components/Achievements';
import About from '/src/components/About.jsx';
import Footer from '/src/components/Footer';



function App() {
  return (
    <div className="w-full bg-cream-bg">
      <Navbar />
      <Hero />
      <Work />
      <About/>
      <Experience />
      <Achievements />
      <Footer/>
    </div>
  );
}

export default App;
