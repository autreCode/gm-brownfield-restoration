"""
Greater Manchester Brownfield Interactive Map
Creates an interactive web map with clickable brownfield sites
"""

import geopandas as gpd
import folium
from folium import plugins

# Load the GeoPackage with risk scores
brownfield = gpd.read_file("../outputs/maps/gm_brownfield_clipped.gpkg")

print(f"Loaded {len(brownfield)} brownfield sites")

# Calculate map center (mean of all coordinates)
center_lat = brownfield.geometry.centroid.y.mean()
center_lon = brownfield.geometry.centroid.x.mean()

# Create base map centered on Greater Manchester
m = folium.Map(
    location=[center_lat, center_lon],
    zoom_start=11,
    tiles='CartoDB positron'
)

# Define colors for risk categories
color_map = {
    'Low': '#27AE60',
    'Medium': '#F39C12',
    'High': '#E74C3C'
}

# Add each brownfield site as a marker
for idx, row in brownfield.iterrows():
    # Get coordinates (folium uses [lat, lon] order, opposite of [lon, lat])
    lat = row.geometry.y
    lon = row.geometry.x
    
    # Create popup content with site details
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
    
    # Add circle marker
    folium.CircleMarker(
        location=[lat, lon],
        radius=6,
        popup=folium.Popup(popup_html, max_width=300),
        color=color_map[row['risk_category']],
        fillColor=color_map[row['risk_category']],
        fillOpacity=0.7,
        weight=2
    ).add_to(m)

# Add layer control
folium.LayerControl().add_to(m)

# Save the map
output_path = "../outputs/maps/gm_brownfield_interactive.html"
m.save(output_path)

print(f"\nInteractive map saved to: {output_path}")
print("Open this file in your web browser to view the map")