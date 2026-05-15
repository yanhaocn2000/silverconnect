import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./i18n/**/*.{js,ts}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "720px",
        lg: "720px",
        xl: "720px",
      },
    },
    extend: {
      // UI_DESIGN.md §1.1 — token-driven palette
      colors: {
        brand: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          soft: "var(--brand-primary-soft)",
          ink: "var(--brand-ink)",
          accent: "var(--brand-accent)",
          "accent-soft": "var(--brand-accent-soft)",
        },
        chip: {
          DEFAULT: "var(--chip-bg)",
          fg: "var(--chip-fg)",
        },
        success: { DEFAULT: "var(--success)", soft: "var(--success-soft)" },
        warning: { DEFAULT: "var(--warning)", soft: "var(--warning-soft)" },
        danger: { DEFAULT: "var(--danger)", soft: "var(--danger-soft)" },
        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          "surface-2": "var(--bg-surface-2)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          placeholder: "var(--text-placeholder)",
          link: "var(--text-link)",
        },
        badge: {
          pending: {
            bg: "var(--badge-pending-bg)",
            fg: "var(--badge-pending-fg)",
          },
          confirmed: {
            bg: "var(--badge-confirmed-bg)",
            fg: "var(--badge-confirmed-fg)",
          },
          inprogress: {
            bg: "var(--badge-inprogress-bg)",
            fg: "var(--badge-inprogress-fg)",
          },
          completed: {
            bg: "var(--badge-completed-bg)",
            fg: "var(--badge-completed-fg)",
          },
          cancelled: {
            bg: "var(--badge-cancelled-bg)",
            fg: "var(--badge-cancelled-fg)",
          },
          refunded: {
            bg: "var(--badge-refunded-bg)",
            fg: "var(--badge-refunded-fg)",
          },
        },
      },
      // UI_DESIGN.md §1.2 — H1 32 / H2 26 / H3 22 / Body 18 / Small 16
      fontSize: {
        small: ["16px", { lineHeight: "1.6" }],
        body: ["18px", { lineHeight: "1.6" }],
        h3: ["22px", { lineHeight: "1.5", fontWeight: "700" }],
        h2: ["26px", { lineHeight: "1.4", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "1.3", fontWeight: "700" }],
      },
      // UI_DESIGN.md §1.3 spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
      spacing: {
        "touch-min": "48px", // minimum touch target
        "touch-btn": "56px", // primary buttons & inputs
      },
      minHeight: {
        touch: "48px",
        "touch-btn": "56px",
      },
      minWidth: {
        touch: "48px",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        popover: "var(--shadow-popover)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      maxWidth: {
        content: "720px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
