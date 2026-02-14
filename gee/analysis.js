/*
Greater Manchester Brownfield Restoration Potential Analysis
Calculates contamination risk scores for registered brownfield sites
based on environmental factors: proximity to water, soil permeability, and terrain.
*/

// Define Greater Manchester boundary manually using approximate coordinates
var greaterManchester = ee.Geometry.Rectangle([-2.7, 53.35, -1.95, 53.65]);

Map.centerObject(greaterManchester, 10);
Map.addLayer(greaterManchester, {color: 'red'}, 'Greater Manchester box', false);
print('Study area:', greaterManchester);

// ===== IMPORT AND FILTER BROWNFIELD REGISTER DATA =====
// Filter to Greater Manchester area only
var brownfieldGM = table.filterBounds(greaterManchester);

// Keep only sites still on the register (no end-date = not yet developed/remediated)
brownfieldGM = brownfieldGM.filter(ee.Filter.or(
  ee.Filter.eq('end-date', ''),
  ee.Filter.eq('end-date', null)
));

// Visualise the filtered brownfield sites
Map.addLayer(brownfieldGM, {color: 'purple'}, 'GM Brownfield Sites', true);

// Load land cover data (ESA WorldCover 10m resolution)
var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .filterBounds(greaterManchester)
  .first()
  .clip(greaterManchester);

// Display land cover with standard visualisation
Map.addLayer(landcover, {}, 'Land Cover', false);

// Define meaningful classification values:
// 50 = Built-up (urban/industrial)
// 60 = Bare/sparse vegetation (potential brownfield)
// 40 = Cropland
// 10 = Trees

// Create a mask for built-up areas
var builtUp = landcover.eq(50);
Map.addLayer(builtUp.selfMask(), {palette: ['red']}, 'Built-up areas', false);

// Load river/watercourse data (HydroSHEDS rivers dataset)
var rivers = ee.FeatureCollection('WWF/HydroSHEDS/v1/FreeFlowingRivers')
  .filterBounds(greaterManchester);

// Calculate distance to nearest watercourse (in meters)
var riverDistance = rivers.distance({searchRadius: 10000, maxError: 10});

// Clip to study area
riverDistance = riverDistance.clip(greaterManchester);

// Visualise distance to rivers (closer = higher risk for contamination spread)
var distanceVis = {
  min: 0,
  max: 5000,  // 5km max distance shown
  palette: ['red', 'yellow', 'green']  // red = close to water (high risk)
};

Map.addLayer(riverDistance, distanceVis, 'Distance to watercourses (m)', false);

// Load soil data - using OpenLandMap soil texture
var soilTexture = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02')
  .select('b0')  // surface layer (0cm depth)
  .clip(greaterManchester);

// Soil texture classes (simplified):
// 1-3 = Clay (low permeability, contaminants stay near surface)
// 4-6 = Loam (medium permeability)
// 7-12 = Sand (high permeability, contamination spreads to groundwater)

//Visualise soil texture
var soilVis = {
  min: 1,
  max: 12,
  palette: ['8B4513', 'D2691E', 'F4A460', 'FFFF00']  // brown to yellow gradient
};

Map.addLayer(soilTexture, soilVis, 'Soil texture', false);

// Load elevation data (SRTM Digital Elevation Model - 30m resolution)
var elevation = ee.Image('USGS/SRTMGL1_003')
  .select('elevation')
  .clip(greaterManchester);

// Calculate slope from elevation (in degrees)
var slope = ee.Terrain.slope(elevation);

// Visualise elevation
var elevationVis = {
  min: 0,
  max: 400,  // meters above sea level
  palette: ['006600', 'FFFF00', 'FF6600', 'FFFFFF']  // green (low) to white (high)
};

Map.addLayer(elevation, elevationVis, 'Elevation (m)', false);

// Visualise slope
var slopeVis = {
  min: 0,
  max: 30,  // degrees
  palette: ['green', 'yellow', 'red']  // green = flat (easy), red = steep (difficult)
};

Map.addLayer(slope, slopeVis, 'Slope (degrees)', false);

// ===== NORMALISE ENVIRONMENTAL LAYERS TO RISK SCORES =====
// Convert raw environmental data to 0-1 risk scales

// 1. Distance to water risk (closer = higher risk)
// Invert so 0m = risk score 1, 5000m = risk score 0
var waterRisk = riverDistance.divide(5000).multiply(-1).add(1).clamp(0, 1);

// 2. Soil permeability risk (sandy soil = higher groundwater contamination risk)
// Texture classes 1-12, where higher = sandier
// Normalise to 0-1 scale
var soilRisk = soilTexture.divide(12);

// 3. Slope risk (flatter = more likely industrial site, higher restoration feasibility)
// Slopes in degrees (0-30), flatten = higher development probability
var slopeRisk = slope.divide(30).multiply(-1).add(1).clamp(0, 1);

// ===== CALCULATE RISK SCORES FOR BROWNFIELD SITES =====
// Instead of creating a region-wide risk map, we'll sample environmental 
// factors at each brownfield site location

// Function to extract environmental values at each point
var addRiskFactors = function(feature) {
  // Get the point geometry
  var point = feature.geometry();
  
  // Sample environmental layers at this location (30m buffer for robustness)
  var waterRiskValue = waterRisk.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: point.buffer(30),
    scale: 30
  }).get('distance');
  
  var soilRiskValue = soilRisk.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: point.buffer(30),
    scale: 30
  }).get('b0');
  
  var slopeRiskValue = slopeRisk.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: point.buffer(30),
    scale: 30
  }).get('slope');
  
  // Calculate total risk (average of three factors, 0-1 scale)
  var totalRisk = ee.Number(waterRiskValue).add(soilRiskValue).add(slopeRiskValue).divide(3);
  
  // Add risk scores as properties to the feature
  return feature.set({
    'water_risk': waterRiskValue,
    'soil_risk': soilRiskValue,
    'slope_risk': slopeRiskValue,
    'total_risk': totalRisk
  });
};

// Apply the function to all brownfield sites
var brownfieldWithRisk = brownfieldGM.map(addRiskFactors);

// Visualise sites coloured by total risk score
var riskPalette = ['green', 'yellow', 'orange', 'red'];
Map.addLayer(brownfieldWithRisk, {}, 'Brownfield Sites (coloured by risk)', false);

// ===== EXPORT RESULTS =====
// Export the brownfield sites with risk scores to Google Drive as CSV
Export.table.toDrive({
  collection: brownfieldWithRisk,
  description: 'GM_brownfield_risk_scores',
  fileFormat: 'CSV',
  selectors: ['reference', 'name', 'site-addre', 'hectares', 
              'ownership-', 'planning_2', 'water_risk', 'soil_risk', 
              'slope_risk', 'total_risk']
});