import React, { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils'; // Import added

const Hero = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Backend se Profile data laana
    api.get('/profile/')
      .then(res => {
        if(res.data.length > 0) setProfile(res.data[0]);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <section id="home" className="min-h-screen pt-40 pb-20 px-6 md:px-12 lg:px-24 flex flex-col justify-between relative">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Big Name */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <h1 className="heading-serif text-[4rem] md:text-[6rem] lg:text-[7.5rem] leading-[0.9] text-dark-text">
            {profile ? profile.full_name.split(' ')[0] : "Prateek"} <br />
            {profile ? profile.full_name.split(' ')[1] : "Sahu"}
          </h1>
          
          <p className="text-xl text-soft-text max-w-lg leading-relaxed mt-4">
            {profile?.tagline || "One of my deepest joys comes from engaging with the people who use visual tools they need to further their goals."}
          </p>

          {/* Profile Image + Status */}
          <div className="flex items-center gap-4 mt-6">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-stone-300">
              {profile?.profile_picture ? (
                // Changed: getImageUrl use kiya
                <img src={getImageUrl(profile.profile_picture)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-300 animate-pulse"></div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider">Available for work</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-stone-500">Based in India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Links */}
        <div className="lg:col-span-4 flex flex-col justify-end lg:items-start space-y-4 pt-10">
          {/* Changed: Resume PDF ke liye bhi getImageUrl use kiya */}
          <QuickLink label="Read my Resume" href={getImageUrl(profile?.resume_pdf)} />
          <QuickLink label="Follow on LinkedIn" href={profile?.linkedin_url} />
          <QuickLink label="Check GitHub" href={profile?.github_url} />
        </div>
      </div>
      
      <div className="hidden lg:block absolute bottom-12 left-24 text-xs font-bold uppercase tracking-widest text-stone-400">
        ( Scroll Down )
      </div>
    </section>
  );
};

const QuickLink = ({ label, href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 text-soft-text hover:text-black transition-colors cursor-pointer">
    <ArrowUpRight size={18} className="text-stone-400 group-hover:text-black" />
    <span className="text-sm font-medium border-b border-transparent group-hover:border-black pb-0.5">
      {label}
    </span>
  </a>
);

export default Hero;