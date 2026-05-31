# MyInvitationCard Builder v1

A FlowCV-inspired two-panel invitation card builder for Indian weddings and events.

## Structure

```
builder1/
├── builder.html          # Main entry point
├── css/                  # All CSS files (modular)
├── js/
│   ├── core/             # EventBus, State, App
│   ├── components/       # UI components
│   │   ├── leftPanel/    # Accordion sections
│   │   ├── centerCanvas/ # Preview & card renderer
│   │   ├── rightPanel/   # Design drawer
│   │   ├── modals/       # Modal dialogs
│   │   └── shared/       # Reusable components
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── config/           # Configuration data
├── data/                 # JSON data files
├── assets/               # Images, fonts, icons
└── lib/                  # External libraries
```

## Layout

- **Topbar**: Dark navigation with logo, template name, and action buttons
- **Left Panel** (360px): Accordion-based content editor
- **Right Canvas**: Live preview of the invitation card
- **Design Drawer**: Slide-in panel for typography, colors, spacing (toggled from topbar)

## Usage

Open `builder.html` in a browser. No build step required.

## Libraries Required (in /lib/)

- `html2canvas.min.js` - PNG export
- `jspdf.min.js` - PDF export  
- `qrcode.min.js` - QR code generation