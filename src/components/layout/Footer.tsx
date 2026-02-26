import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";

const defaultQuickLinks = [
{ label: "About Us", path: "/about" },
{ label: "Products", path: "/products" },
{ label: "Blog", path: "/blog" },
{ label: "Testimonials", path: "/testimonials" },
{ label: "Contact Us", path: "/contact" }];


const defaultPolicyLinks = [
{ label: "Privacy Policy", path: "/privacy-policy" },
{ label: "Return Policy", path: "/return-policy" },
{ label: "Terms & Conditions", path: "/terms" },
{ label: "FAQ", path: "/faq" }];


const Footer = () => {
  const { data: footerData } = usePageContent("footer_settings");
  const f = footerData && typeof footerData === "object" ? footerData as any : {};

  const brandName = f.brand_name || "CommerceX";
  const tagline = f.tagline || "Premium Goods";
  const description =
  f.description ||
  "Your trusted partner for premium quality products. Sourcing the finest goods from around the world since 2010.";
  const copyright = f.copyright || "© 2026 CommerceX. All rights reserved.";
  const address = f.address || "123 Business Avenue, Suite 100, New York, NY 10001";
  const phone = f.phone || "+1 (555) 123-4567";
  const email = f.email || "info@estelweb.com";
  const quickLinks = Array.isArray(f.quick_links) ? f.quick_links : defaultQuickLinks;
  const policyLinks = Array.isArray(f.policy_links) ? f.policy_links : defaultPolicyLinks;

  const footerStyle: React.CSSProperties = {
    backgroundColor: f.bg_color || undefined,
    color: f.text_color || undefined
  };
  const headingStyle: React.CSSProperties = f.heading_color ? { color: f.heading_color } : {};
  const borderStyle: React.CSSProperties = f.border_color ? { borderColor: f.border_color } : {};

  return (
    <footer
      className={`${f.bg_color ? "" : "hero-gradient"} ${f.text_color ? "" : "text-primary-foreground"}`}
      style={footerStyle}>

      <div className="container-wide section-padding py-[30px] pb-[5px]" style={f.text_color ? { color: f.text_color } : {}}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground font-display font-bold text-lg">{brandName.charAt(0)}</span>
              </div>
              <div>
                <span className="font-display text-xl font-bold">{brandName}</span>
                <span className="block text-xs opacity-70 -mt-1">{tagline}</span>
              </div>
            </div>
            <p className="text-sm opacity-70 leading-relaxed mb-6">{description}</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) =>
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">

                  <Icon className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4" style={headingStyle}>
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link: any) =>
              <li key={link.path}>
                  <Link to={link.path} className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                    {link.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4" style={headingStyle}>
              Policies
            </h4>
            <ul className="space-y-3">
              {policyLinks.map((link: any) =>
              <li key={link.path}>
                  <Link to={link.path} className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                    {link.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4" style={headingStyle}>
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 opacity-70 shrink-0" />
                <span className="text-sm opacity-70">{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 opacity-70 shrink-0" />
                <span className="text-sm opacity-70">{phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 opacity-70 shrink-0" />
                <span className="text-sm opacity-70">{email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 py-[10px] border-t flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderColor: f.border_color || "rgba(255,255,255,0.1)" }}>

          <p className="text-sm opacity-50">{copyright}</p>
          <p className="text-sm opacity-50">
            Development by <a href="https://estelweb.com">Exceptional Software Tech</a>
          </p>
        </div>
      </div>
    </footer>);

};

export default Footer;