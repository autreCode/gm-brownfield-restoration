# Greater Manchester Brownfield Restoration Potential

Geospatial analysis identifying former industrial sites with high ecological risk and suitability for nature-based remediation (mycoforestry/phytoremediation).

## Project Overview

This project uses satellite imagery and open environmental datasets to model contamination risk across Greater Manchester's industrial heritage sites. The analysis combines:
- Proximity to watercourses (contamination spread risk)
- Soil permeability (groundwater pollution potential)
- Terrain characteristics (slope, elevation)
- Current land cover (built-up and bare areas as brownfield indicators)

High-risk sites are prioritised for ecological assessment and nature-based restoration interventions.

## Tools & Data Sources

**Analysis:**
- Google Earth Engine (satellite data processing, spatial analysis)
- R (statistical analysis, visualisation)
- QGIS (cartographic output)
- Python (planned: interactive mapping, ML extension)

**Datasets:**
- ESA WorldCover (land cover, 10m resolution)
- WWF HydroSHEDS (river networks)
- OpenLandMap (soil texture/permeability)
- SRTM (elevation, terrain)

## Project Status

**Phase 1: GEE Foundation COMPLETE**
- Study area definition (Greater Manchester bounding box)
- UK brownfield register imported (1,583 active sites in GM)
- Environmental data layers: land cover, watercourses, soil permeability, terrain
- Composite contamination risk score (water proximity + soil + slope)
- Risk scores calculated for all brownfield sites
- Data exported to CSV for analysis

**Phase 2: R Analysis COMPLETE**
- Risk score distribution analysis (1,582 sites)
- Risk categorisation: 746 high, 764 medium, 72 low priority sites
- Top 10 highest risk sites identified (Salford M5 area dominant)
- 772 hectares of high-risk brownfield identified
- Four publication-quality visualisations produced

**Phase 3: QGIS Cartography COMPLETE**
- Polished map with risk-categorized sites (green/orange/red)
- Professional cartographic elements (legend, scale bar, north arrow, title)
- High-resolution export (300 DPI) for portfolio and presentations

**Phase 4: Python Extension & ML (In Progress)**
- Predictive model for restoration success
- Interactive Folium web map for stakeholders

## Repository Structure
```
gm-brownfield-restoration/
├── README.md
├── gee/
│   └── analysis.js          # GEE risk scoring model
├── data/
│   ├── raw/                 # GEE exports
│   └── processed/           # Cleaned datasets
├── r/
│   └── visualisation.R      # Statistical analysis (pending)
├── python/                  # ML extension (pending)
├── qgis/
│   └── final_map.qgz       # Cartographic output (pending)
└── outputs/
    ├── figures/
    └── maps/
```

## Key Findings (Preliminary)

- **2,527 brownfield sites** identified within Greater Manchester bounding box
- **1,583 sites** remain on the active register (not yet developed/remediated)
- Risk scores range from low (rural, elevated sites far from water) to high (urban, flat sites near watercourses)
- Example high-risk site: Bolton Urban Village (risk score 0.81) — flat terrain, very close to river, medium-permeable soil

*Full statistical analysis pending R phase*

## Next Steps

6. Interactive Folium web map (stakeholder-facing: clickable sites with risk scores)

7. Predictive model: restoration success probability based on site characteristics

8. Model validation and 1-page stakeholder explainer
