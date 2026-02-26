import { useHeroSettings } from '@/hooks/useHeroSettings';
import TopHeader from './TopHeader';
import NavBar from './NavBar';

const Header = () => {
  const { data: heroSettings } = useHeroSettings();

  const bothSticky = heroSettings?.sticky_top_header && heroSettings?.sticky_navbar;

  if (bothSticky) {
    return (
      <div className="sticky top-0 z-50">
        <TopHeader forceRelative />
        <NavBar forceRelative />
      </div>
    );
  }

  return (
    <>
      <TopHeader />
      <NavBar />
    </>
  );
};

export default Header;
