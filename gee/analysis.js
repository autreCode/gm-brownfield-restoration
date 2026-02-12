// Define Greater Manchester boundary manually using approximate coordinates
var greaterManchester = ee.Geometry.Rectangle([-2.7, 53.35, -1.95, 53.65]);

Map.centerObject(greaterManchester, 10);
Map.addLayer(greaterManchester, {color: 'red'}, 'Greater Manchester bbox', false);
print('Study area:', greaterManchester);

// Load land cover data (ESA WorldCover 10m resolution)
var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .filterBounds(greaterManchester)
  .first()
  .clip(greaterManchester);

// Print land cover info
print('Land cover:', landcover);

// Display land cover with standard visualization
Map.addLayer(landcover, {}, 'Land Cover', false);

// Define classification values we care about:
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

// Visualize distance to rivers (closer = higher risk for contamination spread)
var distanceVis = {
  min: 0,
  max: 5000,  // 5km max distance shown
  palette: ['red', 'yellow', 'green']  // red = close to water (high risk)
};

Map.addLayer(riverDistance, distanceVis, 'Distance to watercourses (m)', false);
print('River distance raster:', riverDistance);