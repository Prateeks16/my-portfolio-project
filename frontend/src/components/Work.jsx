import React, { useEffect, useState } from 'react';
import { ArrowUpRight, X, Github, ExternalLink } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils';

// --- TECH STACK PARSER ---
const parseTechStack = (stack) => {
  if (!stack) return [];
  try {
    const parsed = JSON.parse(stack);
    if (Array.isArray(parsed)) return parsed;
    return [stack];
  } catch (e) {
    return stack.split(',').map(s => s.trim());
  }
};

const Work = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    api.get('/projects/')
      .then(res => setProjects(res.data))
      .catch(err => console.error("Projects load error", err));
  }, []);

  useEffect(() => {
    if (selectedProject) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
  }, [selectedProject]);

  return (
    <section id="projects" className="py-24 px-6 md:px-12 lg:px-24 bg-[#ECEBE9]">
      <div className="mb-20">
         <h2 className="heading-serif text-5xl md:text-6xl text-dark-text mb-4">Selected Work</h2>
         <div className="w-full h-[1px] bg-stone-300 mt-8"></div>
      </div>

      <div className="flex flex-col gap-20">
        {projects.map((project, index) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            index={index} 
            onReadMore={() => setSelectedProject(project)} 
          />
        ))}
      </div>

      {selectedProject && (
        <ProjectModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </section>
  );
};

const ProjectCard = ({ project, index, onReadMore }) => {
  const isEven = index % 2 === 0;
  const imageUrl = getImageUrl(project.image);
  const tags = parseTechStack(project.tech_stack);

  const themes = [
    { bg: 'bg-[#111111]', text: 'text-[#EAEAEA]', btn: 'bg-white text-black hover:bg-stone-200', tag: 'text-stone-400' }, 
    { bg: 'bg-[#0B1221]', text: 'text-[#E0E6ED]', btn: 'bg-[#4CC9F0] text-black hover:bg-[#3AB0D6]', tag: 'text-blue-200' }, 
    { bg: 'bg-[#1A1412]', text: 'text-[#EBE5E0]', btn: 'bg-[#E5D4C0] text-[#1A1412] hover:bg-[#D4C3AF]', tag: 'text-[#9C8E85]' } 
  ];
  const theme = themes[index % 3];

  return (
    <div className={`group relative rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.01] ${theme.bg} ${theme.text}`}>
      <div className={`flex flex-col lg:flex-row ${isEven ? '' : 'lg:flex-row-reverse'} min-h-[600px]`}>
        
        <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center">
          <div className="mb-10">
            {/* --- UPDATED: Show Full Tech Stack --- */}
            <span className={`text-xs uppercase tracking-widest font-bold ${theme.tag} mb-4 block leading-relaxed`}>
              {/* Join all tags with a separator */}
              {tags.length > 0 ? tags.join(' • ') : "Development"}
            </span>
            
            <h2 className="heading-serif text-4xl lg:text-6xl mb-6 leading-none">
              {project.title}
            </h2>
            <p className="text-lg opacity-80 max-w-md leading-relaxed font-light mb-8">
              {project.short_description}
            </p>

            <div className="flex flex-wrap items-center gap-6">
              <a 
                href={project.live_demo_url || project.github_url}
                target="_blank" rel="noopener noreferrer" 
                className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold tracking-wide transition-all ${theme.btn}`}
              >
                View Live <ArrowUpRight size={18} />
              </a>
              <button 
                onClick={onReadMore} 
                className="group/btn flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:underline underline-offset-4 decoration-2 transition-all opacity-80 hover:opacity-100"
              >
                Read More <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative min-h-[400px] lg:min-h-auto cursor-pointer" onClick={onReadMore}>
          <div className="absolute inset-0 p-8 lg:p-16 flex items-center justify-center">
            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out">
               <img 
                src={imageUrl} 
                alt={project.title} 
                className="w-full h-full object-cover rounded-2xl shadow-2xl opacity-90 group-hover:opacity-100 transition-opacity"
                onError={(e) => { e.target.src = "https://placehold.co/800x600?text=Error+Loading"; }}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${theme.bg.replace('bg-', 'from-')} to-transparent opacity-20 pointer-events-none rounded-2xl`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectModal = ({ project, onClose }) => {
  const imageUrl = getImageUrl(project.image);
  const tags = parseTechStack(project.tech_stack);
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      <div className="relative bg-[#ECEBE9] w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-fadeIn scale-100">
        <button onClick={onClose} className="absolute top-6 right-6 z-20 p-2 bg-white rounded-full hover:bg-black hover:text-white transition-colors shadow-lg">
          <X size={24} />
        </button>

        <div className="overflow-y-auto custom-scrollbar flex flex-col h-full">
          <div className="w-full h-[300px] md:h-[400px] relative shrink-0">
            <img 
              src={imageUrl} 
              alt={project.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#ECEBE9] via-transparent to-transparent opacity-80"></div>
          </div>

          <div className="px-8 md:px-12 pb-12 -mt-20 relative z-10">
            <div className="bg-white p-8 rounded-3xl shadow-sm mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div>
                  <h2 className="heading-serif text-4xl md:text-5xl text-dark-text mb-2">{project.title}</h2>
                  <p className="text-soft-text font-medium">{project.short_description}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-stone-100 rounded-full hover:bg-black hover:text-white transition-colors"><Github size={20} /></a>
                  )}
                  {project.live_demo_url && (
                    <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-stone-100 rounded-full hover:bg-black hover:text-white transition-colors"><ExternalLink size={20} /></a>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tech, i) => (
                  <span key={i} className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold border border-stone-200 uppercase tracking-wide">{tech}</span>
                ))}
              </div>
            </div>
            <div className="prose prose-lg max-w-none text-soft-text leading-relaxed whitespace-pre-line">
              <h3 className="heading-serif text-3xl text-dark-text mb-4">Project Overview</h3>
              {project.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Work;
