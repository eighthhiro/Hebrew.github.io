function saveChartData() {
    if (!window.chartData || window.chartData.length === 0) {
        alert("No chart data available to save.");
        return;
    }

    // Get current chart configuration
    const selectedAge = document.getElementById('chart-age-filter').value;
    const selectedScoreType = document.getElementById('chart-score-filter').value || scoreColumns[0];
    const chartFilter = document.getElementById('chart-filter').value || 'mode';
    const scoreDisplayName = selectedScoreType.replace('_Score', '');

    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Set appropriate headers based on chart type
    if (chartFilter === 'pearson') {
        csvContent += `Age,Average ${scoreDisplayName} Score\n`;
    } else if (!selectedAge) {
        csvContent += `Age,Mode ${scoreDisplayName} Score\n`;
    } else {
        csvContent += `Score Range Start,Score Range End,Frequency\n`;
    }

    // Add data rows
    window.chartData.forEach(point => {
        if (selectedAge && chartFilter !== 'pearson') {
            // For frequency distribution (histogram)
            csvContent += `${point.x},${point.binEnd},${point.y}\n`;
        } else {
            // For other chart types (scatter/line)
            csvContent += `${point.x},${point.y}\n`;
        }
    });

    // Create and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chart_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function parseCSV(csvContent) {
    // Split the CSV content into rows and columns, handling edge cases
    const rows = csvContent
        .split("\n")
        .map(row => row.trim())  // Trim whitespace
        .filter(row => row.length > 0)  // Remove empty rows
        .map(row => row.split(",").map(cell => cell.trim()));  // Split by comma and trim spaces
    
    return rows;
}

// Combined filter function to handle both age and score type filtering
function applyFilters() {
    const ageFilter = document.getElementById('age-filter');
    const scoreTypeFilter = document.getElementById('score-type-filter');
    
    const selectedAge = ageFilter.value;
    const selectedScoreType = scoreTypeFilter.value;
    
    // Filter rows by age
    let filteredRows = rowsData;
    if (selectedAge) {
        filteredRows = rowsData.filter(row => row[columnIndexes['Age']] === selectedAge);
    }
    
    // Filter columns by score type
    let filteredColumns = scoreColumns;
    if (selectedScoreType) {
        filteredColumns = [selectedScoreType]; // Show only the selected score column
    }
    
    // Rebuild the table with filtered data
    buildTable(filteredRows, filteredColumns);
}

// Keep the old filterByAge function for backward compatibility
function filterByAge() {
    applyFilters();
}

// Function to round numbers for chart display
function roundForChart(value, decimalPlaces = 0) {
    return Math.round(value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

// Function to calculate Pearson's correlation coefficient
function calculatePearsonCorrelation(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length === 0) {
        return 0;
    }
    
    // Calculate means
    const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
    const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    
    // Calculate the numerator and denominators
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < xValues.length; i++) {
        const xDiff = xValues[i] - xMean;
        const yDiff = yValues[i] - yMean;
        numerator += xDiff * yDiff;
        xDenominator += xDiff * xDiff;
        yDenominator += yDiff * yDiff;
    }
    
    // Check for zero denominators to avoid division by zero
    if (xDenominator === 0 || yDenominator === 0) {
        return 0;
    }
    
    return numerator / Math.sqrt(xDenominator * yDenominator);
}

// Update the chart update function to handle the new filter option
function updateChart() {
    if (!rowsData || rowsData.length === 0) return;
    
    const ctx = document.getElementById('chart-output').getContext('2d');

    // Destroy previous chart if exists
    if (chart) {
        chart.destroy();
    }

    const selectedAge = document.getElementById('chart-age-filter').value;
    const selectedScoreType = document.getElementById('chart-score-filter').value || scoreColumns[0];
    const chartFilter = document.getElementById('chart-filter').value || 'mode';

    let chartData = [];
    let chartTitle = "Chart Section";
    let chartType = "scatter";  // Always use scatter as default
    let regressionLine = null;

    // Handle Pearson's correlation (always for all ages)
    if (chartFilter === 'pearson') {
        // Extract valid age-score pairs and round to reduce data points
        const ageScorePairs = {};
        
        rowsData.forEach(row => {
            const age = parseInt(row[columnIndexes['Age']]);
            let score = parseFloat(row[columnIndexes[selectedScoreType]]);
            
            if (!isNaN(age) && !isNaN(score)) {
                // Round score to 1 decimal place to reduce data points
                score = roundForChart(score, 1);
                
                // Group by age to calculate average score
                if (!ageScorePairs[age]) {
                    ageScorePairs[age] = [];
                }
                ageScorePairs[age].push(score);
            }
        });
        
        // Create data points from age groups
        const xValues = [];
        const yValues = [];
        
        Object.entries(ageScorePairs).forEach(([age, scores]) => {
            // Calculate average score for this age
            const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const roundedAvgScore = roundForChart(avgScore, 1);
            
            xValues.push(parseInt(age));
            yValues.push(roundedAvgScore);
            
            chartData.push({
                x: parseInt(age),
                y: roundedAvgScore
            });
        });
        
        // Handle case with no valid data points
        if (chartData.length === 0) {
            chart = new Chart(ctx, {
                type: 'scatter',
                data: { datasets: [] },
                options: { 
                    plugins: { title: { display: true, text: 'No valid data points found' } } 
                }
            });
            return;
        }
        
        // Calculate Pearson's correlation coefficient
        const correlationCoefficient = calculatePearsonCorrelation(xValues, yValues);
        
        // Calculate linear regression for the line
        if (xValues.length > 1) {
            // Calculate slope and intercept for y = mx + b
            const n = xValues.length;
            const sumX = xValues.reduce((a, b) => a + b, 0);
            const sumY = yValues.reduce((a, b) => a + b, 0);
            const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
            const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Generate regression line data points
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            
            regressionLine = {
                type: 'line',
                label: 'Regression Line',
                data: [
                    { x: minX, y: roundForChart(minX * slope + intercept, 1) },
                    { x: maxX, y: roundForChart(maxX * slope + intercept, 1) }
                ],
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            };
        }
        
        const scoreDisplayName = selectedScoreType.replace('_Score', '');
        chartTitle = `${scoreDisplayName} Score vs Age (r = ${correlationCoefficient.toFixed(2)})`;
    }
    // Mode distribution for All Ages
    else if (!selectedAge) {
        // MODE: All Ages -> Mode Score vs Age
        const ageScores = {};
        rowsData.forEach(row => {
            const age = parseInt(row[columnIndexes['Age']]);
            const score = parseFloat(row[columnIndexes[selectedScoreType]]);
            
            if (!isNaN(age) && !isNaN(score)) {
                if (!ageScores[age]) {
                    ageScores[age] = [];
                }
                ageScores[age].push(score);
            }
        });

        chartData = Object.keys(ageScores).map(age => {
            const scores = ageScores[age];

            // Calculate mode
            const frequency = {};
            scores.forEach(score => {
                // Round the score for better grouping
                const roundedScore = roundForChart(score, 1);
                frequency[roundedScore] = (frequency[roundedScore] || 0) + 1;
            });

            let modeScore = 0;
            let maxFrequency = 0;
            
            Object.keys(frequency).forEach(score => {
                if (frequency[score] > maxFrequency) {
                    maxFrequency = frequency[score];
                    modeScore = parseFloat(score);
                }
            });

            return {
                x: parseInt(age),
                y: modeScore
            };
        });

        const scoreDisplayName = selectedScoreType.replace('_Score', '');
        chartTitle = `Mode ${scoreDisplayName} Score vs Age`;
    } 
    // Mode distribution for Specific Age (frequency distribution)
    else {
        // MODE: Specific Age -> Grouped Frequency Distribution (histogram-like)
        
        // Get all scores for the selected age and score type
        const scores = rowsData
            .filter(row => row[columnIndexes['Age']] === selectedAge)
            .map(row => parseFloat(row[columnIndexes[selectedScoreType]]))
            .filter(score => !isNaN(score));
        
        if (scores.length === 0) {
            chart = new Chart(ctx, {
                type: 'scatter',
                data: { datasets: [] },
                options: { 
                    plugins: { title: { display: true, text: 'No valid data points found' } } 
                }
            });
            return;
        }
        
        // Find min and max scores to determine range
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        
        // Determine appropriate bin size based on data range
        // Try to keep number of bins between 8-12 for readability
        const range = maxScore - minScore;
        let binSize = 5; // Default bin size
        
        if (range <= 20) binSize = 2;
        else if (range <= 40) binSize = 5;
        else if (range <= 80) binSize = 10;
        else binSize = 20;
        
        // Create bins
        const bins = {};
        const firstBinStart = Math.floor(minScore / binSize) * binSize;
        
        // Initialize bins
        for (let binStart = firstBinStart; binStart <= maxScore; binStart += binSize) {
            bins[binStart] = 0;
        }
        
        // Count scores in each bin
        scores.forEach(score => {
            const binIndex = Math.floor(score / binSize) * binSize;
            bins[binIndex] = (bins[binIndex] || 0) + 1;
        });
        
        // Convert bins to chart data points
        chartData = Object.keys(bins).map(binStart => ({
            x: parseInt(binStart),  // Start of bin range
            y: bins[binStart],      // Frequency count
            binEnd: parseInt(binStart) + binSize // End of bin range
        }));

        const scoreDisplayName = selectedScoreType.replace('_Score', '');
        chartTitle = `${scoreDisplayName} Score Distribution for Age ${selectedAge} (bin size: ${binSize})`;
        
        // Use a bar chart for better histogram visualization
        chartType = "bar";
    }

    // Sort data points by x-value for better visualization
    chartData.sort((a, b) => a.x - b.x);

    // Setup datasets
    const datasets = [{
        label: chartTitle,
        data: chartData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        ...(chartType === 'scatter' ? { radius: 5 } : {}),
        barPercentage: 1.0,
        categoryPercentage: 0.9,
    }];
    
    // Add regression line to datasets if available
    if (regressionLine) {
        datasets.push(regressionLine);
    }

    // Create new chart
    chart = new Chart(ctx, {
        type: chartType,
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: { 
                        display: true, 
                        text: (selectedAge && chartFilter !== 'pearson') ? 'Score Range' : 'Age' 
                    },
                    // For frequency distribution with bins
                    ...(selectedAge && chartFilter !== 'pearson' ? {
                        type: 'linear',
                        ticks: {
                            callback: function(value) {
                                return value;
                            }
                        }
                    } : {})
                },
                y: {
                    title: { 
                        display: true, 
                        text: (selectedAge && chartFilter !== 'pearson') ? 'Frequency' : 
                              selectedScoreType.replace('_Score', '') + ' Score'
                    },
                    // For frequency, always use integer values
                    ...(selectedAge && chartFilter !== 'pearson' ? {
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        }
                    } : {})
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (selectedAge && chartFilter !== 'pearson') {
                                if (chartType === 'bar') {
                                    const binStart = context.parsed.x;
                                    const binEnd = context.raw.binEnd;
                                    return `Score range: ${binStart}-${binEnd}, Frequency: ${context.parsed.y}`;
                                } else {
                                    return `Score: ${context.parsed.x}, Frequency: ${context.parsed.y}`;
                                }
                            } else if (chartFilter === 'pearson') {
                                return `Age: ${context.parsed.x}, Avg Score: ${context.parsed.y.toFixed(1)}`;
                            } else {
                                return `Age: ${context.parsed.x}, Mode Score: ${context.parsed.y}`;
                            }
                        }
                    }
                }
            }
        } 
    });

    window.chartData = chartData;
    
    if (document.getElementById('chart-filter').value === "pearson") {
        window.correlationData = data.correlationValues; // If you calculate correlation
    }
    
    // Show save button since we have data to save
    showSaveDataButton();
}
