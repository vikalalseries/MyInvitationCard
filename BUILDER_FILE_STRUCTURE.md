# Builder Page - Fully Separated File & Folder Structure

## Project Root Structure

```
/
├── index.html                    (Landing/Home Page)
├── template-dashboard.html       (Template Selection Page)
├── builder/                      (NEW - Completely Separated Builder)
│   ├── builder.html             (Main builder entry point)
│   ├── css/
│   ├── js/
│   ├── assets/
│   └── data/
├── preview.html                 (Card Preview Page)
├── about.html                   (About Page)
├── css/                         (Global styles)
├── js/                          (Global scripts)
├── assets/                      (Global assets)
├── data/                        (Global data)
└── backend/                     (Backend services)
```

---

## Builder Folder - Complete Structure

```
/builder/
│
├── builder.html                 # Main HTML entry point for builder page
│
├── /css/
│   ├── main.css                # Global styles for builder
│   ├── layout.css              # Layout (grid, flexbox)
│   ├── topbar.css              # Top navigation bar styles
│   ├── left-panel.css          # Left panel accordion styles
│   ├── center-canvas.css       # Center preview canvas styles
│   ├── right-panel.css         # Right properties drawer styles
│   ├── bottom-bar.css          # Bottom action bar styles
│   ├── components.css          # Reusable component styles (buttons, inputs, etc)
│   ├── accordion.css           # Accordion specific styles
│   ├── drawer.css              # Drawer/modal styles
│   ├── forms.css               # Form inputs styles
│   ├── typography.css          # Typography system
│   ├── colors.css              # Color variables & palettes
│   ├── spacing.css             # Spacing utilities
│   ├── animations.css          # Transitions & animations
│   ├── dark-mode.css           # Dark theme styles
│   ├── responsive.css          # Media queries & responsive styles
│   ├── print.css               # Print-specific styles
│   └── utilities.css           # Utility classes
│
├── /js/
│   │
│   ├── main.js                 # App initialization & main logic
│   │
│   ├── /core/
│   │   ├── app.js              # Main app controller
│   │   ├── state.js            # Global state management
│   │   ├── eventBus.js         # Event emitter for component communication
│   │   └── router.js           # Route handler if needed
│   │
│   ├── /components/
│   │   ├── topbar.js           # Top navigation component
│   │   ├── leftPanel.js        # Left panel controller
│   │   ├── centerCanvas.js     # Center canvas controller
│   │   ├── rightPanel.js       # Right panel drawer controller
│   │   ├── bottomBar.js        # Bottom bar controller
│   │   │
│   │   ├── /leftPanel/
│   │   │   ├── accordion.js    # Accordion functionality
│   │   │   ├── groomSection.js # Groom info section
│   │   │   ├── brideSection.js # Bride info section
│   │   │   ├── eventsSection.js# Events/ceremonies section
│   │   │   ├── balAagrahSection.js
│   │   │   ├── darshnabhilashiSection.js
│   │   │   ├── swagatakankshiSection.js
│   │   │   ├── vinitSection.js
│   │   │   └── advancedSection.js
│   │   │
│   │   ├── /centerCanvas/
│   │   │   ├── preview.js      # Card preview renderer
│   │   │   ├── zoomControls.js # Zoom/fit controls
│   │   │   └── cardRenderer.js # Actual card rendering logic
│   │   │
│   │   ├── /rightPanel/
│   │   │   ├── drawer.js       # Drawer toggle & animation
│   │   │   ├── tabs.js         # Tab switching logic
│   │   │   ├── typographyTab.js# Typography controls
│   │   │   ├── colorsTab.js    # Color picker logic
│   │   │   ├── spacingTab.js   # Spacing controls
│   │   │   ├── decorationsTab.js
│   │   │   └── presetTab.js
│   │   │
│   │   ├── /modals/
│   │   │   ├── modal.js        # Base modal logic
│   │   │   ├── exportDialog.js # Download options
│   │   │   ├── printDialog.js  # Print settings
│   │   │   ├── shareDialog.js  # Share options
│   │   │   ├── saveCardModal.js# Save as custom card
│   │   │   └── colorPickerModal.js
│   │   │
│   │   └── /shared/
│   │       ├── formElements.js # Form inputs, checkboxes, toggles
│   │       ├── buttons.js      # Button components
│   │       ├── colorPicker.js  # Color picker component
│   │       ├── fontPicker.js   # Font selector
│   │       ├── slider.js       # Slider/range input
│   │       ├── datePicker.js   # Date input with calendar
│   │       ├── dropdown.js     # Dropdown select
│   │       ├── toast.js        # Notification toast
│   │       └── loader.js       # Loading spinner
│   │
│   ├── /services/
│   │   ├── exportService.js    # PNG, PDF, JPG, SVG export
│   │   ├── printService.js     # Print handling
│   │   ├── templateService.js  # Load/save card templates
│   │   ├── storageService.js   # LocalStorage management
│   │   ├── shareService.js     # URL share, QR code
│   │   ├── cardRenderer.js     # Render card to canvas
│   │   ├── ceremonyService.js  # Event/ceremony logic
│   │   ├── dateService.js      # Date calculations
│   │   └── apiService.js       # Backend API calls
│   │
│   ├── /utils/
│   │   ├── constants.js        # App constants & config
│   │   ├── validators.js       # Input validation
│   │   ├── formatters.js       # Date/text formatting
│   │   ├── colorUtils.js       # Color operations
│   │   ├── textUtils.js        # Text processing
│   │   ├── domHelpers.js       # DOM utilities
│   │   ├── logger.js           # Debug logging
│   │   └── helpers.js          # General helpers
│   │
│   └── /config/
│       ├── templates.js        # Template configurations
│       ├── ceremonies.js       # Indian ceremonies data
│       ├── colors.js           # Color palettes
│       ├── fonts.js            # Font options
│       └── regions.js          # Indian regions data
│
├── /assets/
│   ├── /images/
│   │   ├── /templates/
│   │   │   ├── up-hindu-wedding.jpg
│   │   │   ├── up-hindu-engagement.jpg
│   │   │   └── ... (template previews)
│   │   │
│   │   ├── /decorations/
│   │   │   ├── swastika.svg
│   │   │   ├── laxmi-mata.svg
│   │   │   ├── kalash.svg
│   │   │   ├── diya.svg
│   │   │   ├── flowers.svg
│   │   │   ├── lotus.svg
│   │   │   └── /borders/
│   │   │       ├── traditional.svg
│   │   │       ├── floral.svg
│   │   │       └── gold-pattern.svg
│   │   │
│   │   ├── /icons/
│   │   │   ├── download.svg
│   │   │   ├── print.svg
│   │   │   ├── share.svg
│   │   │   ├── undo.svg
│   │   │   ├── redo.svg
│   │   │   ├── save.svg
│   │   │   ├── close.svg
│   │   │   ├── menu.svg
│   │   │   └── ... (UI icons)
│   │   │
│   │   └── /logos/
│   │       ├── logo.png
│   │       └── logo-dark.png
│   │
│   └── /fonts/
│       ├── Cinzel-Regular.ttf
│       ├── Cinzel-Bold.ttf
│       ├── Montserrat-Regular.ttf
│       ├── Montserrat-Bold.ttf
│       ├── Playfair-Display-Regular.ttf
│       └── Playfair-Display-Bold.ttf
│
├── /data/
│   ├── ceremonies.json          # Indian ceremonies & events
│   ├── color-palettes.json      # Pre-defined color schemes
│   ├── fonts-config.json        # Font family configs
│   ├── predefined-texts.json    # Common text templates (Hindi)
│   ├── regions-religions.json   # Indian regions & religions
│   ├── template-configs.json    # Template definitions
│   └── indian-states.json       # States & cities data
│
├── /lib/
│   ├── html2canvas.min.js       # For screenshot/export
│   ├── jspdf.min.js             # For PDF export
│   ├── qrcode.min.js            # For QR code generation
│   └── ... (external libraries)
│
├── index.html                   # Backup/Reference
└── README.md                    # Builder documentation

```

---

## Detailed File Descriptions

### HTML Entry Point

**`builder/builder.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation Card Builder</title>
    
    <!-- Styles -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/topbar.css">
    <link rel="stylesheet" href="css/left-panel.css">
    <link rel="stylesheet" href="css/center-canvas.css">
    <link rel="stylesheet" href="css/right-panel.css">
    <link rel="stylesheet" href="css/bottom-bar.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/forms.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="stylesheet" href="css/responsive.css">
</head>
<body>
    <!-- Main App Container -->
    <div id="app" class="builder-app">
        <!-- Top Navigation Bar -->
        <div id="topbar-container"></div>
        
        <!-- Main Layout Container -->
        <div class="builder-main-layout">
            <!-- Left Panel -->
            <div id="left-panel-container" class="left-panel-wrapper"></div>
            
            <!-- Center Canvas -->
            <div id="center-canvas-container" class="center-canvas-wrapper"></div>
            
            <!-- Right Panel Drawer -->
            <div id="right-panel-container" class="right-panel-wrapper"></div>
        </div>
        
        <!-- Bottom Action Bar -->
        <div id="bottom-bar-container"></div>
    </div>
    
    <!-- Modals Container -->
    <div id="modals-container"></div>
    
    <!-- Toast Notifications -->
    <div id="toast-container" class="toast-container"></div>
    
    <!-- External Libraries -->
    <script src="../lib/html2canvas.min.js"></script>
    <script src="../lib/jspdf.min.js"></script>
    <script src="../lib/qrcode.min.js"></script>
    
    <!-- Builder Scripts -->
    <script src="js/config/constants.js"></script>
    <script src="js/config/templates.js"></script>
    <script src="js/config/ceremonies.js"></script>
    <script src="js/config/colors.js"></script>
    <script src="js/config/fonts.js"></script>
    <script src="js/config/regions.js"></script>
    
    <script src="js/utils/logger.js"></script>
    <script src="js/utils/validators.js"></script>
    <script src="js/utils/formatters.js"></script>
    <script src="js/utils/colorUtils.js"></script>
    <script src="js/utils/textUtils.js"></script>
    <script src="js/utils/domHelpers.js"></script>
    <script src="js/utils/helpers.js"></script>
    
    <script src="js/core/state.js"></script>
    <script src="js/core/eventBus.js"></script>
    <script src="js/core/app.js"></script>
    
    <script src="js/services/storageService.js"></script>
    <script src="js/services/dateService.js"></script>
    <script src="js/services/ceremonyService.js"></script>
    <script src="js/services/cardRenderer.js"></script>
    <script src="js/services/exportService.js"></script>
    <script src="js/services/printService.js"></script>
    <script src="js/services/shareService.js"></script>
    <script src="js/services/templateService.js"></script>
    <script src="js/services/apiService.js"></script>
    
    <script src="js/components/shared/formElements.js"></script>
    <script src="js/components/shared/buttons.js"></script>
    <script src="js/components/shared/colorPicker.js"></script>
    <script src="js/components/shared/fontPicker.js"></script>
    <script src="js/components/shared/slider.js"></script>
    <script src="js/components/shared/datePicker.js"></script>
    <script src="js/components/shared/dropdown.js"></script>
    <script src="js/components/shared/toast.js"></script>
    <script src="js/components/shared/loader.js"></script>
    
    <script src="js/components/modals/modal.js"></script>
    <script src="js/components/modals/exportDialog.js"></script>
    <script src="js/components/modals/printDialog.js"></script>
    <script src="js/components/modals/shareDialog.js"></script>
    <script src="js/components/modals/saveCardModal.js"></script>
    <script src="js/components/modals/colorPickerModal.js"></script>
    
    <script src="js/components/leftPanel/accordion.js"></script>
    <script src="js/components/leftPanel/groomSection.js"></script>
    <script src="js/components/leftPanel/brideSection.js"></script>
    <script src="js/components/leftPanel/eventsSection.js"></script>
    <script src="js/components/leftPanel/balAagrahSection.js"></script>
    <script src="js/components/leftPanel/darshnabhilashiSection.js"></script>
    <script src="js/components/leftPanel/swagatakankshiSection.js"></script>
    <script src="js/components/leftPanel/vinitSection.js"></script>
    <script src="js/components/leftPanel/advancedSection.js"></script>
    
    <script src="js/components/centerCanvas/zoomControls.js"></script>
    <script src="js/components/centerCanvas/cardRenderer.js"></script>
    <script src="js/components/centerCanvas/preview.js"></script>
    
    <script src="js/components/rightPanel/tabs.js"></script>
    <script src="js/components/rightPanel/typographyTab.js"></script>
    <script src="js/components/rightPanel/colorsTab.js"></script>
    <script src="js/components/rightPanel/spacingTab.js"></script>
    <script src="js/components/rightPanel/decorationsTab.js"></script>
    <script src="js/components/rightPanel/presetTab.js"></script>
    <script src="js/components/rightPanel/drawer.js"></script>
    
    <script src="js/components/topbar.js"></script>
    <script src="js/components/leftPanel.js"></script>
    <script src="js/components/centerCanvas.js"></script>
    <script src="js/components/rightPanel.js"></script>
    <script src="js/components/bottomBar.js"></script>
    
    <script src="js/main.js"></script>
</body>
</html>
```

---

### CSS Files Purpose

| File | Purpose |
|------|---------|
| `main.css` | Global reset, base styles, font imports |
| `layout.css` | Grid/flexbox layout system |
| `topbar.css` | Top navigation styling |
| `left-panel.css` | Left panel & accordion styling |
| `center-canvas.css` | Center preview area styling |
| `right-panel.css` | Right drawer panel styling |
| `bottom-bar.css` | Bottom action bar styling |
| `components.css` | Reusable component styles |
| `accordion.css` | Accordion specific animations |
| `drawer.css` | Drawer/modal animations |
| `forms.css` | Form input, textarea, select styles |
| `typography.css` | Font sizes, weights, line heights |
| `colors.css` | Color variables & palettes |
| `spacing.css` | Margin/padding utilities |
| `animations.css` | Transitions & keyframe animations |
| `dark-mode.css` | Dark theme overrides |
| `responsive.css` | Media queries & breakpoints |
| `print.css` | Print-specific rules |
| `utilities.css` | Utility classes (hidden, flex, etc) |

---

### JavaScript Files Purpose

| Path | Purpose |
|------|---------|
| `js/core/app.js` | Main app initialization |
| `js/core/state.js` | Global state management |
| `js/core/eventBus.js` | Event communication between components |
| `js/components/topbar.js` | Render & manage topbar |
| `js/components/leftPanel.js` | Render & manage left panel |
| `js/components/centerCanvas.js` | Render & manage center canvas |
| `js/components/rightPanel.js` | Render & manage right panel drawer |
| `js/components/bottomBar.js` | Render & manage bottom bar |
| `js/services/exportService.js` | PNG/PDF/JPG/SVG export logic |
| `js/services/printService.js` | Print dialog & settings |
| `js/services/templateService.js` | Save/load card templates |
| `js/services/storageService.js` | LocalStorage management |
| `js/services/shareService.js` | Share URL, QR code generation |
| `js/utils/validators.js` | Input validation functions |
| `js/utils/formatters.js` | Date, text formatting |

---

### Configuration Data Files

**`data/ceremonies.json`**
```json
{
  "uttar-pradesh-hindu": [
    {
      "id": "matimangara",
      "name": "मातिमांगरा",
      "englishName": "MATIMANGARA",
      "description": "Engagement ceremony"
    },
    {
      "id": "haldi",
      "name": "हल्दी",
      "englishName": "HALDI",
      "description": "Turmeric ceremony"
    },
    // ... more ceremonies
  ]
}
```

**`data/color-palettes.json`**
```json
{
  "traditional-gold": {
    "primary": "#c9a84c",
    "secondary": "#fdf8f0",
    "text": "#3a2e24",
    "accent": "#7c4a3a"
  },
  "saffron-green": {
    "primary": "#ff9933",
    "secondary": "#138808",
    "text": "#1a1410",
    "accent": "#1f41cb"
  }
}
```

---

### Data Files Structure

```
/builder/data/
├── ceremonies.json              # Indian ceremonies database
├── color-palettes.json         # Pre-defined color schemes
├── fonts-config.json           # Font configurations
├── predefined-texts.json       # Common text templates
├── regions-religions.json      # Indian regions & religions
├── template-configs.json       # Template definitions
└── indian-states.json          # Indian states, cities, districts
```

---

## Import Order in HTML

**Critical**: Scripts must load in this order:

1. **Config files** - Define constants & data
2. **Utils** - Helper functions
3. **Core** - State management & event bus
4. **Services** - Business logic
5. **Shared Components** - Reusable UI elements
6. **Modals** - Modal dialogs
7. **Feature Components** - Section specific components
8. **Main Components** - Layout components (topbar, panels)
9. **main.js** - App initialization

---

## Separation from Root Project

### What's Independent in Builder:

- ✅ Completely separate HTML file
- ✅ Independent CSS (no dependencies on root CSS)
- ✅ Independent JS (self-contained modules)
- ✅ Own assets (decorations, templates, icons)
- ✅ Own data files
- ✅ Own configuration

### What's Shared with Root (if needed):

- 📁 `/lib/` folder (external libraries like html2canvas)
- 🎨 Global color scheme (can override in builder)
- 🔤 Font files (can load locally in builder)

### Navigation:

```html
<!-- From index.html to builder -->
<a href="builder/builder.html">Open Builder</a>

<!-- From builder back to home -->
<a href="../index.html">Back to Home</a>

<!-- From builder to templates -->
<a href="../template-dashboard.html">Choose Template</a>
```

---

## Build Commands

```json
{
  "scripts": {
    "build": "echo 'Building invitation cards builder'",
    "dev": "open builder/builder.html",
    "export": "node scripts/export-builder.js"
  }
}
```

---

## Key Features of This Structure

✅ **Completely Isolated**: Builder works independently
✅ **Scalable**: Easy to add new sections/features
✅ **Modular**: Each component is self-contained
✅ **Maintainable**: Clear folder hierarchy
✅ **Testable**: Each module can be tested separately
✅ **Performance**: Lazy load components as needed
✅ **Flexible**: Easy to remove/add ceremony types or templates

---

**This structure ensures your builder page is fully separated while maintaining clean organization and easy navigation.**
