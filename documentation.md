# Network Graph Visualization Documentation

## Overview

This application provides an interactive network graph visualization of relationships between individuals based on data from a CSV file. It allows users to explore connections, filter by relationship types and ventures, search for specific individuals, and export the visualization.

## Features

### Core Features
- Interactive network visualization showing connections between individuals
- Node representation for each person with appropriate sizing based on influence/connections
- Edge visualization showing relationship types with color coding
- Filtering capabilities by connection type, ventures, or other attributes
- Search functionality to find specific individuals
- Detailed information display when selecting a node
- Export functionality for data and images
- Performance optimization for large datasets

### Technical Implementation
- Built with Highcharts network graph module
- Dynamic data parsing from CSV
- Responsive design for various screen sizes

## Usage Guide

### Basic Navigation
- **Zoom**: Use mouse wheel to zoom in/out
- **Pan**: Click and drag on the background to pan around the graph
- **Select Node**: Click on a node to see detailed information
- **Hover**: Hover over a node or edge to see a tooltip with basic information

### Search & Filtering
- Use the search box to find specific individuals by name
- Filter by relationship types using the checkboxes
- Filter by ventures to show only individuals associated with specific ventures

### Export Options
- **Export Data (JSON)**: Exports the current visible graph data as a JSON file
- **Export Image (PNG)**: Creates a PNG image of the current graph visualization
- **Optimize Performance**: Adjusts rendering parameters for better performance with large datasets

## Technical Notes

### Data Format
The application expects a CSV file with the following columns:
- Name: Individual's name
- Influence: Text describing relationships/influences (used to extract connections)
- Ventures: Semicolon-separated list of ventures associated with the individual
- Connections: Semicolon-separated list of connected individuals
- Quotes: Pipe-separated list of quotes by the individual

### Performance Considerations
- For large datasets (50+ nodes), use the "Optimize Performance" button
- The application uses various optimization techniques:
  - Reduced simulation complexity for layout algorithm
  - Smaller node sizes for less visual clutter
  - Efficient data processing
  - Option to limit the number of visible nodes based on connection count

### Browser Compatibility
- The application works best on modern browsers (Chrome, Firefox, Safari, Edge)
- Required JavaScript features: Fetch API, Promises, async/await

## Customization

### Adding New Relationship Types
To add new relationship types with custom colors:
1. Add the relationship type and color to the `relationshipColors` object in main.js
2. The legend will automatically update to include the new relationship type

### Changing Visual Appearance
- Edit style.css to modify the visual appearance of the graph and UI elements
- Node sizing can be adjusted in the marker.radius function in createNetworkGraph

## Troubleshooting

### Common Issues
- **Graph not loading**: Check that the CSV file is properly formatted and accessible
- **Performance issues**: Use the "Optimize Performance" button for large datasets
- **Export not working**: Ensure your browser allows file downloads
