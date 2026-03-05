"""
Greater Manchester Brownfield Interactive Map
Creates an interactive web map with clickable brownfield sites
Enhanced with layer groups, marker clustering, and recentre button
"""

import geopandas as gpd
import folium
from folium import plugins

# Load the GeoPackage with risk scores
brownfield = gpd.read_file("../outputs/maps/gm_brownfield_clipped.gpkg")

print(f"Loaded {len(brownfield)} brownfield sites")

# Calculate map center
center_lat = brownfield.geometry.centroid.y.mean()
center_lon = brownfield.geometry.centroid.x.mean()

# Create base map
m = folium.Map(
    location=[center_lat, center_lon],
    zoom_start=11,
    tiles='CartoDB positron'
    # control_scale=True  # Adds a scale bar (commented out - see custom scale below)
)

# Add custom scale bar with better positioning and size
scale = folium.plugins.MeasureControl(
    position='topleft',
    primary_length_unit='kilometers',
    secondary_length_unit='miles',
    primary_area_unit='sqkilometers',
    secondary_area_unit='sqmiles'
)
scale.add_to(m)

# Define colors for risk categories
color_map = {
    'Low': '#27AE60',
    'Medium': '#F39C12',
    'High': '#E74C3C'
}

# Create separate feature groups for each risk category
feature_groups = {}
for category in ['High', 'Medium', 'Low']:
    fg = plugins.MarkerCluster(name=f'{category} Risk Sites')
    feature_groups[category] = fg

# Add each brownfield site to its appropriate feature group
for idx, row in brownfield.iterrows():
    lat = row.geometry.y
    lon = row.geometry.x
    
    # Create popup content
    popup_html = f"""
    <div style="font-family: Arial; width: 250px;">
        <h4 style="margin-bottom: 10px;">{row['site.addre.y']}</h4>
        <table style="width: 100%;">
            <tr><td><b>Reference:</b></td><td>{row['reference']}</td></tr>
            <tr><td><b>Size:</b></td><td>{row['hectares.y']:.2f} hectares</td></tr>
            <tr><td><b>Risk Category:</b></td><td><span style="color: {color_map[row['risk_category']]}; font-weight: bold;">{row['risk_category']}</span></td></tr>
            <tr><td><b>Total Risk Score:</b></td><td>{row['total_risk']:.3f}</td></tr>
            <tr><td><b>Water Risk:</b></td><td>{row['water_risk']:.3f}</td></tr>
            <tr><td><b>Soil Risk:</b></td><td>{row['soil_risk']:.3f}</td></tr>
            <tr><td><b>Slope Risk:</b></td><td>{row['slope_risk']:.3f}</td></tr>
        </table>
    </div>
    """
    
    # Create marker and add to appropriate feature group
    folium.CircleMarker(
        location=[lat, lon],
        radius=6,
        popup=folium.Popup(popup_html, max_width=300),
        color=color_map[row['risk_category']],
        fillColor=color_map[row['risk_category']],
        fillOpacity=0.7,
        weight=2
    ).add_to(feature_groups[row['risk_category']])

# Add all feature groups to the map
for fg in feature_groups.values():
    fg.add_to(m)

# Add layer control
folium.LayerControl(collapsed=False).add_to(m)

# Add a recentre button using custom JavaScript
# Store the initial center and zoom in the map's HTML
recentre_script = f"""
<div id="recentre-btn" style="
    position: fixed;
    top: 10px;
    left: 50px;
    z-index: 1000;
    background-color: white;
    border: 2px solid rgba(0,0,0,0.2);
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 1px 5px rgba(0,0,0,0.2);
">
    Recentre Map
</div>

<script>
// Wait for the map to be fully loaded
setTimeout(function() {{
    var recentreBtn = document.getElementById('recentre-btn');
    if (recentreBtn) {{
        recentreBtn.onclick = function() {{
            // Get reference to the Leaflet map (Folium creates a global variable)
            var mapObj = window[Object.keys(window).filter(key => key.startsWith('map_'))[0]];
            if (mapObj) {{
                mapObj.setView([{center_lat}, {center_lon}], 11);
            }}
        }};
    }}
}}, 1000);
</script>
"""

m.get_root().html.add_child(folium.Element(recentre_script))

# Add title and description overlay
title_html = f"""
<div style="
    position: fixed;
    bottom: 20px;
    right: 10px;
    width: 350px;
    background-color: white;
    border: 2px solid rgba(0,0,0,0.2);
    border-radius: 8px;
    padding: 15px;
    z-index: 1000;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
">
    <h3 style="margin: 0 0 10px 0; color: #2C3E50;">Greater Manchester Brownfield Sites</h3>
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #555;">
        Environmental risk assessment of {len(brownfield)} active brownfield sites.
    </p>
    <div style="font-size: 12px; color: #666; line-height: 1.6;">
        <p style="margin: 5px 0;"><strong>Risk Factors:</strong></p>
        <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Proximity to watercourses</li>
            <li>Soil permeability</li>
            <li>Terrain flatness</li>
        </ul>
        <p style="margin: 10px 0 5px 0;"><strong>Risk Categories:</strong></p>
        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
            <span><span style="color: #E74C3C;">●</span> High: {(brownfield['risk_category'] == 'High').sum()} sites</span>
            <span><span style="color: #F39C12;">●</span> Medium: {(brownfield['risk_category'] == 'Medium').sum()} sites</span>
            <span><span style="color: #27AE60;">●</span> Low: {(brownfield['risk_category'] == 'Low').sum()} sites</span>
        </div>
    </div>
    <p style="margin: 12px 0 0 0; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 8px;">
        Click markers for site details | Toggle layers to filter by risk | Created by Daniel Crompton, 2026.
    </p>
</div>
"""

m.get_root().html.add_child(folium.Element(title_html))

# Save the map
output_path = "../outputs/maps/gm_brownfield_interactive.html"
m.save(output_path)

print(f"\nInteractive map saved to: {output_path}")
print(f"Features added:")
print(f"  - Layer groups for High/Medium/Low risk sites")
print(f"  - Marker clustering for cleaner view at zoomed-out levels")
print(f"  - Layer control to toggle categories on/off")
print(f"  - Recentre button to reset map view")
print(f"  - Scale bar")