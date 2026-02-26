import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { Target, Eye, Users } from 'lucide-react';
import { usePageContent } from '@/hooks/usePageContent';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import { Skeleton } from '@/components/ui/skeleton';
import DynamicPageSections from '@/components/DynamicPageSections';

const About = () => {
  const { data: aboutContent } = usePageContent('about_content');
  const { data: missionText } = usePageContent('mission_text');
  const { data: visionText } = usePageContent('vision_text');
  const { data: teamMembers } = usePageContent('team_members');
  const { data: sections = [] } = usePageSectionsBySlug('about');

  const team = Array.isArray(teamMembers) ? teamMembers : [];
  const enabledSections = sections.filter(s => s.is_enabled);

  return (
    <Layout>
      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">About Us</h1>
          <p className="mt-3 text-primary-foreground/70 max-w-2xl mx-auto">Delivering premium quality products worldwide</p>
        </div>
      </section>

      {/* If page sections exist, render them dynamically */}
      {enabledSections.length > 0 ? (
        <DynamicPageSections sections={enabledSections} />
      ) : (
        /* Fallback: legacy static layout */
        <section className="section-padding bg-background">
          <div className="container-wide max-w-4xl">
            <p className="text-lg text-muted-foreground leading-relaxed mb-12">
              {typeof aboutContent === 'string' ? aboutContent : 'We are a leading global supplier of premium products.'}
            </p>

            <div id="mission" className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-card rounded-2xl border border-border p-8 card-elevated">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-secondary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-3">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {typeof missionText === 'string' ? missionText : 'To provide the highest quality premium products sourced responsibly.'}
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-card rounded-2xl border border-border p-8 card-elevated">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-secondary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-3">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {typeof visionText === 'string' ? visionText : "To become the world's most trusted premium goods marketplace."}
                </p>
              </motion.div>
            </div>

            {team.length > 0 && (
              <div id="team">
                <div className="text-center mb-12">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-foreground">Our Team</h2>
                  <p className="mt-2 text-muted-foreground">Meet the people behind our success</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {team.map((member: any) => (
                    <div key={member.name} className="text-center bg-card rounded-xl border border-border p-6 card-elevated">
                      <div className="w-20 h-20 mx-auto rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl mb-4">
                        {member.avatar}
                      </div>
                      <h3 className="font-display font-semibold text-foreground">{member.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{member.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default About;
