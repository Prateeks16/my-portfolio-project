import React from 'react';

const Navbar = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed top-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
      {/* Pointer events auto taaki buttons click ho sakein */}
      <nav className="pointer-events-auto bg-white/80 backdrop-blur-md px-8 py-3 rounded-full shadow-sm border border-stone-200 flex items-center gap-8 text-sm font-medium text-stone-600 transition-all hover:shadow-md">
        {['Home', 'Projects', 'About', 'Work experience' ,'Contact'].map((item) => (
          <button 
            key={item}
            onClick={() => scrollToSection(item.toLowerCase())}
            className="hover:text-black transition-colors"
          >
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Navbar;