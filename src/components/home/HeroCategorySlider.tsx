import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { usePageContent } from '@/hooks/usePageContent';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

const defaultSlides = [
  {
    image: '',
    title: 'Source the Finest Premium Products',
    subtitle: 'Your trusted partner for premium quality goods worldwide.',
    cta_text: 'Shop Now',
    cta_link: '/products',
  },
  {
    image: '',
    title: 'Exclusive Deals on Top Categories',
    subtitle: 'Discover handpicked products at unbeatable prices.',
    cta_text: 'Browse Deals',
    cta_link: '/products',
  },
  {
    image: '',
    title: 'Fast & Reliable Global Shipping',
    subtitle: 'We deliver to over 100 countries with care and speed.',
    cta_text: 'Learn More',
    cta_link: '/about',
  },
];

const HeroCategorySlider = () => {
  const { data: adminSlides } = usePageContent('hero_slides');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const slides = Array.isArray(adminSlides) && adminSlides.length > 0 ? adminSlides : defaultSlides;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(nextSlide, 5000);
    return () => clearInterval(timerRef.current);
  }, [nextSlide, paused]);

  return (
    <section className="bg-background">
      <div
        className="relative overflow-hidden h-[260px] sm:h-[360px] md:h-[460px] lg:h-[520px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
          {slides.map((slide: any, idx: number) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {slide.image ? (
                <img
                  src={slide.image}
                  alt={slide.title || `Slide ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  fetchPriority={idx === 0 ? 'high' : undefined}
                />
              ) : (
                <div className="absolute inset-0 hero-gradient" />
              )}
              <div className="absolute inset-0 bg-foreground/20" />

              <div className="relative z-10 flex items-center h-full px-8 md:px-12">
                <div className="max-w-lg">
                  {slide.title && (
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground leading-tight mb-3">
                      {slide.title}
                    </h1>
                  )}
                  {slide.subtitle && (
                    <p className="text-sm md:text-base text-primary-foreground/80 mb-6">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.cta_text && slide.cta_link && (
                    <Link to={slide.cta_link}>
                      <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-6">
                        {slide.cta_text}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center hover:opacity-70 transition-opacity"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-7 h-7 text-primary-foreground drop-shadow-md" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center hover:opacity-70 transition-opacity"
            aria-label="Next slide"
          >
            <ChevronRight className="w-7 h-7 text-primary-foreground drop-shadow-md" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentSlide ? 'bg-secondary' : 'bg-primary-foreground/30'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
    </section>
  );
};

export default HeroCategorySlider;
