// Define Greater Manchester boundary manually using approximate coordinates
var greaterManchester = ee.Geometry.Rectangle([-2.7, 53.35, -1.95, 53.65]);

Map.centerObject(greaterManchester, 10);
Map.addLayer(greaterManchester, {color: 'red'}, 'Greater Manchester box', false);
print('Study area:', greaterManchester);

// Load land cover data (ESA WorldCover 10m resolution)
var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .filterBounds(greaterManchester)
  .first()
  .clip(greaterManchester);

// Print land cover info
print('Land cover:', landcover);

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

// Create a mask for bare/sparse areas (potential brownfield indicators)
var bareSparse = landcover.eq(60);
Map.addLayer(bareSparse.selfMask(), {palette: ['brown']}, 'Bare/sparse vegetation', false);

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
print('River distance raster:', riverDistance);

// Load soil data - using OpenLandMap soil texture
var soilTexture = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02')
  .select('b0')  // surface layer (0cm depth)
  .clip(greaterManchester);

// Soil texture classes (simplified):
// 1-3 = Clay (low permeability, contaminants stay near surface)
// 4-6 = Loam (medium permeability)
// 7-12 = Sand (high permeability, contamination spreads to groundwater)

// Visualize soil texture
var soilVis = {
  min: 1,
  max: 12,
  palette: ['8B4513', 'D2691E', 'F4A460', 'FFFF00']  // brown to yellow gradient
};

Map.addLayer(soilTexture, soilVis, 'Soil texture', false);
print('Soil texture:', soilTexture);

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

print('Elevation:', elevation);
print('Slope:', slope);

// ===== REFINE TO FOCUS ON VACANT BROWNFIELD =====
// We want bare/sparse areas that are NEAR built-up zones (derelict former industrial)
// not just any bare ground (which could be natural)

// Calculate distance to built-up areas
var builtUpDistance = builtUp.fastDistanceTransform().sqrt()
  .multiply(ee.Image.pixelArea().sqrt());
  
// Create a "brownfield probability" mask:
// Bare/sparse areas within 500m of built-up zones
var brownfieldMask = bareSparse.and(builtUpDistance.lt(500));
Map.addLayer(brownfieldMask.selfMask(), {palette: ['purple']}, 'Likely Brownfield Sites', false);

// ===== RISK SCORING SYSTEM =====
// Normalise each factor to 0-1 scale, then combine them

// 1. Distance to water risk (closer = higher risk)
// Invert so 0m = risk score 1, 5000m = risk score 0
var waterRisk = riverDistance.divide(5000).multiply(-1).add(1).clamp(0, 1);
// 2. Soil permeability risk (sandy soil = higher groundwater contamination risk)
// Texture classes 1-12, where higher = sandier
// Normalize to 0-1 scale
var soilRisk = soilTexture.divide(12);
// 3. Slope risk (steeper = harder to remediate, but we'll invert: flatter = more likely industrial site)
// Slopes in degrees (0-30), flatten = higher development probability
var slopeRisk = slope.divide(30).multiply(-1).add(1).clamp(0, 1);
// 4. Land cover risk (built-up and bare areas = potential brownfield)
// Create binary masks: 1 if built/bare, 0 otherwise
// landcoverRisk only flags brownfield areas relating to "brownfield probability"
var landcoverRisk = brownfieldMask;

// ===== COMBINE RISK FACTORS =====
// Equal weighting for now (can adjust later)
var totalRisk = waterRisk.add(soilRisk).add(slopeRisk).add(landcoverRisk);
// Normalize total risk to 0-1 scale by dividing by number of factors (4)
totalRisk = totalRisk.divide(4);

// Visualize the final risk score
var riskVis = {
  min: 0,
  max: 1,
  palette: ['green', 'yellow', 'orange', 'red']  // green = low risk, red = high priority
};

Map.addLayer(totalRisk, riskVis, 'Contamination Risk Score', true);
print('Total risk score:', totalRisk);