import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Ensure like button hover/active colors are generated
        'bg-green-50', 'hover:bg-green-50', 'bg-green-100', 'hover:bg-green-100',
        'text-green-600', 'hover:text-green-700',
        'dark:hover:bg-green-900/20', 'dark:hover:bg-green-900/30',
        'bg-emerald-50', 'hover:bg-emerald-50', 'bg-emerald-100', 'hover:bg-emerald-100',
        'text-emerald-600', 'hover:text-emerald-700',
        'dark:hover:bg-emerald-900/20', 'dark:hover:bg-emerald-900/30'
    ],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Lato', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))', // Main primary color
					foreground: 'hsl(var(--primary-foreground))', // Text on primary
					// Custom ProSalud colors
					prosalud: '#00529B', // ProSalud Blue
					'prosalud-light': '#E3F2FD', // Light blue for backgrounds/accents
					'prosalud-dark': '#003A70',  // Darker ProSalud Blue
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))', // Main secondary color
					foreground: 'hsl(var(--secondary-foreground))', // Text on secondary
					// Custom ProSalud colors
					prosaludgreen: '#4CAF50', // ProSalud Green
					'prosaludgreen-dark': '#388E3C', // Darker ProSalud Green
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))' // Lighter text (e.g., #6c757d)
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))', // Main accent color
					foreground: 'hsl(var(--accent-foreground))', // Text on accent
					prosaludteal: '#17a2b8', // ProSalud Teal
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))', // Card background (e.g., #ffffff)
					foreground: 'hsl(var(--card-foreground))' // Text in card (e.g., #212529)
				},
				// Custom text colors
				'text-dark': '#333333',
				'text-light': '#FFFFFF',
				'text-gray': '#555555',
				'prosalud-border': '#DDDDDD',
				'background-light': '#F8F9FA', // Page background
				// ... keep existing sidebar colors
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Added specific ProSalud brand colors for the title
				'prosalud-pro': '#0078a0',
				'prosalud-salud': '#0095c8',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				fadeIn: {
					'0%': { opacity: '0', transform: 'translateY(4px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fadeIn': 'fadeIn 0.3s ease-out',
				pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
				float: "float 3s ease-in-out infinite",
				shimmer: "shimmer 3s ease-in-out infinite",
			},
			perspective: {
				"1000": "1000px",
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
