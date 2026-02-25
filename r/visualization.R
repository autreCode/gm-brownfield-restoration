# Greater Manchester Brownfield Risk Analysis
# Visualization and statistical summary of GEE risk scores

# NOTE: Set working directory to the 'r/' folder before running
# In RStudio: Session > Set Working Directory > To Source File Location

# Load libraries ----
library(ggplot2)
library(dplyr)
library(tidyr)

# Set theme for plots
theme_set(theme_minimal(base_size = 14))

# Read in the data (assumes working directory is r/)
brownfield <- read.csv("../data/raw/GM_brownfield_risk_scores.csv")

# Initial data exploration ----
str(brownfield)
summary(brownfield)
head(brownfield)

# Check for missing values in risk scores
sum(is.na(brownfield$total_risk))

# Clean data ----
# Remove the one site with missing hectares (can't analyse size properly)
brownfield_clean <- brownfield %>% 
  filter(!is.na(hectares))

# Create risk categories for easier interpretation
brownfield_clean <- brownfield_clean %>%
  mutate(
    risk_category = case_when(
      total_risk >= 0.8 ~ "High",
      total_risk >= 0.7 ~ "Medium",
      TRUE ~ "Low"
    ),
    risk_category = factor(risk_category, levels = c("Low", "Medium", "High"))
  )

# Summary statistics by risk category
risk_summary <- brownfield_clean %>%
  group_by(risk_category) %>%
  summarise(
    n_sites = n(),
    mean_hectares = mean(hectares),
    total_hectares = sum(hectares)
  )

print(risk_summary)

# ===== VISUALIZATIONS =====

# 1. Distribution of total risk scores (histogram)
risk_distribution <- ggplot(brownfield_clean, aes(x = total_risk)) +
  geom_histogram(bins = 30, fill = "#2C3E50", color = "white") +
  geom_vline(xintercept = 0.8, linetype = "dashed", color = "red", linewidth = 0.75) +
  annotate("text", x = 0.82, y = 150, label = "High risk threshold", 
           hjust = 0, color = "red", size = 4) +
  labs(
    title = "Distribution of Contamination Risk Scores",
    subtitle = "Greater Manchester brownfield sites (n = 1,582)",
    x = "Total Risk Score (0 = low, 1 = high)",
    y = "Number of Sites"
  ) +
  theme(
    plot.title = element_text(hjust = 0.5),
    plot.subtitle = element_text(hjust = 0.5),
    plot.margin = margin(t = 10, r = 10, b = 10, l = 10)
  )

print(risk_distribution)

# 2. Number of sites by risk category (bar chart)
risk_category_chart <- ggplot(risk_summary, aes(x = risk_category, y = n_sites, fill = risk_category)) +
  geom_col(width = 0.7) +
  geom_text(aes(label = n_sites), vjust = -0.5, size = 4, fontface = "bold") +
  scale_fill_manual(values = c("Low" = "#27AE60", "Medium" = "#F39C12", "High" = "#E74C3C")) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.1))) +
  labs(
    title = "Brownfield Sites by Risk Category",
    subtitle = "Greater Manchester active register sites",
    x = NULL,
    y = "Number of Sites"
  ) +
  theme(
    plot.title = element_text(hjust = 0.5),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    plot.margin = margin(t = 10, r = 10, b = 10, l = 10)
  )

print(risk_category_chart)

# 3. Site size vs. risk score (scatter plot)
size_risk_scatter <- ggplot(brownfield_clean, aes(x = hectares, y = total_risk)) +
  geom_point(aes(color = risk_category), alpha = 0.6, size = 2.5) +
  scale_color_manual(values = c("Low" = "#27AE60", "Medium" = "#F39C12", "High" = "#E74C3C")) +
  scale_x_log10(labels = scales::comma) +
  geom_hline(yintercept = 0.8, linetype = "dashed", color = "red", linewidth = 0.75, alpha = 0.5) +
  labs(
    title = "Site Size vs. Contamination Risk",
    subtitle = "Larger sites don't necessarily pose higher environmental risk",
    x = "Site Area (hectares, log scale)",
    y = "Total Risk Score",
    color = "Risk Category"
  ) +
  theme(
    plot.title = element_text(hjust = 0.5),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "bottom",
    plot.margin = margin(t = 10, r = 10, b = 10, l = 10)
  )

print(size_risk_scatter)

# ===== SAVE PLOTS =====
ggsave(
  filename = "../outputs/figures/risk_distribution.png",
  plot = risk_distribution,
  width = 10,
  height = 7,
  dpi = 300
)

ggsave(
  filename = "../outputs/figures/risk_category_chart.png",
  plot = risk_category_chart,
  width = 10,
  height = 7,
  dpi = 300
)

ggsave(
  filename = "../outputs/figures/size_risk_scatter.png",
  plot = size_risk_scatter,
  width = 10,
  height = 7,
  dpi = 300
)

print("All plots saved successfully")

# ===== TOP 10 HIGHEST RISK SITES =====
top10 <- brownfield_clean %>%
  arrange(desc(total_risk)) %>%
  slice(1:10) %>%
  select(reference, site.addre, hectares, water_risk, soil_risk, slope_risk, total_risk) %>%
  mutate(
    across(where(is.numeric), ~ round(., 3)),
    hectares = round(hectares, 2)
  )

print(top10)

# Save as CSV for use in QGIS and report
write.csv(top10, 
          "../outputs/figures/top10_highest_risk_sites.csv", 
          row.names = FALSE)

# Top 10 sites horizontal bar chart
top10_chart <- ggplot(top10, aes(x = total_risk, 
                                 y = reorder(stringr::str_trunc(site.addre, 50), total_risk),
                                 fill = total_risk)) +
  geom_col(width = 0.7) +
  geom_text(aes(label = round(total_risk, 3)), 
            hjust = -0.1, 
            size = 3.5,
            fontface = "bold") +
  scale_fill_gradient(low = "#F5CBA7", high = "#C0392B") +
  scale_x_continuous(expand = c(0, 0)) +
  coord_cartesian(xlim = c(0.85, 0.91)) +
  labs(
    title = "Top 10 Highest Risk Brownfield Sites",
    subtitle = "Greater Manchester — ranked by composite environmental risk score\nNote: x-axis starts at 0.85 to show variation between closely-scored sites",
    x = "Total Risk Score",
    y = NULL
  ) +
  theme(
    plot.title = element_text(hjust = 0.5),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    plot.margin = margin(t = 10, r = 30, b = 10, l = 10),
    axis.text.y = element_text(size = 9)
  )

print(top10_chart)

ggsave(
  filename = "../outputs/figures/top10_risk_sites.png",
  plot = top10_chart,
  width = 12,
  height = 7,
  dpi = 300
)

# ===== PREPARE DATA FOR QGIS =====
library(sf)

# Load the shapefile (has geometry required for QGIS)
brownfield_shp <- st_read("../assets/uk_brownfield.shp")

# Join with our risk-categorised data
# Match by reference ID
brownfield_spatial <- brownfield_shp %>%
  inner_join(brownfield_clean, by = "reference")

# Export as GeoPackage for QGIS
st_write(brownfield_spatial, 
         "../outputs/maps/gm_brownfield_risk.gpkg",
         delete_dsn = TRUE)

print("GeoPackage created successfully for QGIS")