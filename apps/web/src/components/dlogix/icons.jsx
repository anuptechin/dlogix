/*  Dlogix — line icon set
 *  All icons draw on a 24×24 grid, inherit `currentColor` and scale with font-size.
 *  Stroke weight is 1.6 so they stay crisp at the 18–26px sizes used on the page.
 */
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Svg = ({ children, size = 24, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);

export const IconEnquire = (p) => (
  <Svg {...p}>
    <path {...S} d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path {...S} d="M14 3v5h5" />
    <circle {...S} cx="11" cy="14" r="2.6" />
    <path {...S} d="m13 16 2 2" />
  </Svg>
);

export const IconCompare = (p) => (
  <Svg {...p}>
    <path {...S} d="M4 20h16" />
    <path {...S} d="M7 20v-6M12 20V8M17 20v-9" />
  </Svg>
);

export const IconQuote = (p) => (
  <Svg {...p}>
    <path {...S} d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path {...S} d="M14 3v5h5" />
    <path {...S} d="M8.5 12h7M8.5 15.5h4.5" />
  </Svg>
);

export const IconShipBox = (p) => (
  <Svg {...p}>
    <path {...S} d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2z" />
    <path {...S} d="m4 7.2 8 4.2 8-4.2M12 11.4V21" />
  </Svg>
);

export const IconTrack = (p) => (
  <Svg {...p}>
    <path {...S} d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11" />
    <circle {...S} cx="12" cy="10" r="2.6" />
  </Svg>
);

export const IconClipboard = (p) => (
  <Svg {...p}>
    <path {...S} d="M9 4H7.5A1.5 1.5 0 0 0 6 5.5v14A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 16.5 4H15" />
    <rect {...S} x="9" y="2.5" width="6" height="3.4" rx="1" />
    <path {...S} d="M9 11.5h6M9 15h4" />
  </Svg>
);

export const IconDocument = (p) => (
  <Svg {...p}>
    <path {...S} d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path {...S} d="M14 3v5h5M9 13h6M9 16.5h6" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <circle {...S} cx="12" cy="12" r="8.6" />
    <path {...S} d="m8.4 12.2 2.5 2.5 4.7-5" />
  </Svg>
);

export const IconVessel = (p) => (
  <Svg {...p}>
    <path {...S} d="M3.6 14.5 5 10.2h14l1.4 4.3" />
    <path {...S} d="M7.5 10.2V7.4h9v2.8M10.4 7.4V5h3.2v2.4" />
    <path {...S} d="M2.8 15.2c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4" />
    <path {...S} d="M2.8 19c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4" />
  </Svg>
);

export const IconPlane = (p) => (
  <Svg {...p}>
    <path {...S} d="M20.6 4.1a1.9 1.9 0 0 0-2.7 0l-2.6 2.6-9.1-2.4-1.8 1.8 7.4 4.4-3 3-3.3-.6-1.3 1.3 3.4 1.9 1.9 3.4 1.3-1.3-.6-3.3 3-3 4.4 7.4 1.8-1.8-2.4-9.1 2.6-2.6a1.9 1.9 0 0 0 0-2.7" />
  </Svg>
);

export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle {...S} cx="12" cy="12" r="8.6" />
    <path {...S} d="M3.4 12h17.2" />
    <path {...S} d="M12 3.4c2.2 2.3 3.4 5.4 3.4 8.6S14.2 18.3 12 20.6C9.8 18.3 8.6 15.2 8.6 12S9.8 5.7 12 3.4" />
  </Svg>
);

export const IconBars = (p) => (
  <Svg {...p}>
    <path {...S} d="M4 19.5h16" />
    <rect {...S} x="6" y="11" width="3.2" height="6" rx="0.8" />
    <rect {...S} x="10.9" y="6.5" width="3.2" height="10.5" rx="0.8" />
    <rect {...S} x="15.8" y="9" width="3.2" height="8" rx="0.8" />
  </Svg>
);

export const IconDatabase = (p) => (
  <Svg {...p}>
    <ellipse {...S} cx="12" cy="6" rx="7" ry="3" />
    <path {...S} d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
    <path {...S} d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
  </Svg>
);

export const IconShield = (p) => (
  <Svg {...p}>
    <path {...S} d="M12 2.8 5 5.6v5.9c0 4.3 2.9 8.2 7 9.7 4.1-1.5 7-5.4 7-9.7V5.6z" />
    <path {...S} d="m8.8 11.9 2.3 2.3 4.1-4.4" />
  </Svg>
);

export const IconPartners = (p) => (
  <Svg {...p}>
    <circle {...S} cx="9" cy="8.4" r="3" />
    <path {...S} d="M3.4 19.2a5.6 5.6 0 0 1 11.2 0" />
    <path {...S} d="M16.2 6.1a3 3 0 0 1 0 5.8M17.6 14.6a5.6 5.6 0 0 1 3 4.6" />
  </Svg>
);

export const IconUser = (p) => (
  <Svg {...p}>
    <circle {...S} cx="12" cy="8.4" r="3.4" />
    <path {...S} d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
  </Svg>
);

export const IconPlay = (p) => (
  <Svg {...p}>
    <circle {...S} cx="12" cy="12" r="8.8" />
    <path {...S} d="m10.3 8.8 5.2 3.2-5.2 3.2z" />
  </Svg>
);

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path {...S} d="M4.5 12h15M13.6 6.2 19.4 12l-5.8 5.8" />
  </Svg>
);

/* Microsoft four-square mark — flat colour, not a line icon. */
export const IconMicrosoft = ({ size = 18, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" {...rest}>
    <path fill="#F35325" d="M2 2h9.4v9.4H2z" />
    <path fill="#81BC06" d="M12.6 2H22v9.4h-9.4z" />
    <path fill="#05A6F0" d="M2 12.6h9.4V22H2z" />
    <path fill="#FFBA08" d="M12.6 12.6H22V22h-9.4z" />
  </svg>
);
