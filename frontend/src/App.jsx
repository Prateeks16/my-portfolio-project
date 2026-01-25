import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Work from './components/Work';
import Experience from './components/Experience'; 
import Achievements from './components/Achievements';
import About from './components/About';
import Footer from './components/Footer';



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
