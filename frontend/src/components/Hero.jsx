import React, { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils';

const Hero = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get('/profile/')
      .then(res => {
        if(res.data.length > 0) setProfile(res.data[0]);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <section id="home" className="min-h-screen pt-32 pb-12 px-6 md:px-12 lg:px-24 flex flex-col justify-center relative">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Big Name */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <h1 className="heading-serif text-6xl sm:text-[5rem] md:text-[6rem] lg:text-[7.5rem] leading-[0.9] text-dark-text tracking-tighter">
            {profile ? profile.full_name.split(' ')[0] : "Prateek"} <br />
            {profile ? profile.full_name.split(' ')[1] : "Sahu"}
          </h1>
          
          {/* --- NEW QUOTE (Styled like Jose Ocando) --- */}
          <div className="mt-6 max-w-2xl">
            <p className="text-lg md:text-2xl text-soft-text leading-relaxed font-serif italic opacity-90">
              {'"Every great developer you know got there by solving problems they were unqualified to solve until they actually did it."'}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mt-3">
              — Patrick McKenzie
            </p>
          </div>

          <div className="flex items-center gap-5 mt-8">
            {/* Square Photo */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-stone-300 shrink-0 shadow-sm">
              {profile?.profile_picture ? (
                <img src={getImageUrl(profile.profile_picture)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-300 animate-pulse"></div>
              )}
            </div>
            
            {/* Roles - Same Style & Clean Alignment */}
            <div className="flex flex-col justify-center gap-1.5 border-l border-stone-300 pl-5">
              <span className="text-sm font-bold uppercase tracking-widest text-black leading-none">
                Data Science
              </span>
              <span className="text-sm font-bold uppercase tracking-widest text-black leading-none">
                Backend Developer
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Links */}
        <div className="lg:col-span-4 flex flex-col items-start lg:items-start space-y-5 pt-8 lg:pt-0 border-t lg:border-t-0 border-stone-300 mt-8 lg:mt-0">
          <QuickLink label="Read my Resume" href={getImageUrl(profile?.resume_pdf)} />
          <QuickLink label="Follow on LinkedIn" href={profile?.linkedin_url} />
          <QuickLink label="Check GitHub" href={profile?.github_url} />
        </div>
      </div>
    </section>
  );
};

const QuickLink = ({ label, href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 text-soft-text hover:text-black transition-colors cursor-pointer">
    <ArrowUpRight size={20} className="text-stone-400 group-hover:text-black transition-colors" />
    <span className="text-base font-medium border-b border-transparent group-hover:border-black pb-0.5 transition-all">
      {label}
    </span>
  </a>
);

export default Hero;