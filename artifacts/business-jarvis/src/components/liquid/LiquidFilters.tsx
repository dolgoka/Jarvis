export function LiquidFilters() {
  return (
    <svg
      width="0" height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        {/* Деликатное преломление — эталонный рецепт scale 26 */}
        <filter
          id="liquid"
          x="-25%" y="-25%" width="150%" height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.013"
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feGaussianBlur in="n" stdDeviation="1.1" result="nb" />
          <feDisplacementMap
            in="SourceGraphic" in2="nb"
            scale="26"
            xChannelSelector="R" yChannelSelector="G"
          />
        </filter>

        {/* Витринное преломление — эталонный рецепт scale 44 */}
        <filter
          id="liquid-strong"
          x="-30%" y="-30%" width="160%" height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.01"
            numOctaves="2"
            seed="4"
            result="n"
          />
          <feGaussianBlur in="n" stdDeviation="1.4" result="nb" />
          <feDisplacementMap
            in="SourceGraphic" in2="nb"
            scale="44"
            xChannelSelector="R" yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
