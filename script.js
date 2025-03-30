let rowsData = [];  // Array to store the rows data for filtering
let ageData = [];   // Array to store unique age values for the filter
let columnIndexes = {};  // To map column names to their respective indices
let scoreColumns = [];  // Array to store all _Score column names

// Chart.js variables
let chart = null;

function showSaveDataButton() {
    document.getElementById('save-data-button').style.display = 'block';
}

// Function to hide the Save Data button when no data is available
function hideSaveDataButton() {
    document.getElementById('save-data-button').style.display = 'none';
}


// Help Button
document.addEventListener('DOMContentLoaded', function() {
    // Get the help button element
    const helpButton = document.querySelector('.helpbutton button');
    
    // Create help modal HTML structure
    const helpModalHTML = `
    <div id="help-modal" class="modal">
        <div class="modal-content">
            <span class="close-help-modal">&times;</span>
            <h2>Welcome to Scatterer</h2>
            
            <div class="help-section">
                <h3>How to Use This Tool</h3>
                <ol>
                    <li>Upload a CSV file containing student data</li>
                    <li>Review your data in the File Reader section</li>
                    <li>Explore visualizations in the Data Visualization section</li>
                </ol>
                
                <h3>CSV File Requirements</h3>
                <ul>
                    <li>Must include <strong>Student_ID</strong> column</li>
                    <li>Must include <strong>Age</strong> column</li>
                    <li>Must include at least one column ending with <strong>_Score</strong> (e.g., Math_Score)</li>
                    <li>First row should contain column headers</li>
                    <li>Use comma as the delimiter</li>
                </ul>
                
                <h3>Calculation Methods</h3>
                <h4>Mode Distribution</h4>
                <p>Displays the most frequent score value for each age group, showing the central tendency of scores across different ages.</p>
                
                <h4>Correlation Analysis</h4>
                <p>Calculates the Pearson correlation coefficient between age and scores, indicating the strength and direction of the linear relationship between these variables:</p>
                <ul>
                    <li>Coefficient close to 1: Strong positive correlation</li>
                    <li>Coefficient close to -1: Strong negative correlation</li>
                    <li>Coefficient close to 0: Weak or no correlation</li>
                </ul>
            </div>
            
            <div class="modal-actions">
                <button id="help-close-button">Got It</button>
            </div>
        </div>
    </div>`;
    
    // Append help modal to body
    document.body.insertAdjacentHTML('beforeend', helpModalHTML);
    
    // Get help modal elements
    const helpModal = document.getElementById('help-modal');
    const closeHelpModal = document.querySelector('.close-help-modal');
    const helpCloseButton = document.getElementById('help-close-button');
    
    // Add click event to help button to show the modal
    helpButton.addEventListener('click', function() {
        helpModal.style.display = 'block';
    });
    
    // Add click events to close the modal
    closeHelpModal.addEventListener('click', function() {
        helpModal.style.display = 'none';
    });
    
    helpCloseButton.addEventListener('click', function() {
        helpModal.style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        if (event.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });
});

function previewFile() {
    const fileInput = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name-display');
    const filePreview = document.getElementById('file-preview');

    const fileName = fileInput.files[0] ? fileInput.files[0].name : '';
    fileNameDisplay.innerText = fileName ? `${fileName}` : '';

    // Check if the file is a CSV
    if (!fileInput.files[0] || fileInput.files[0].type !== 'text/csv') {
        filePreview.innerHTML = "<p>Please upload a valid CSV file.</p>";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        const rows = parseCSV(fileContent);

        // Get the header row
        const headers = rows[0];
        
        // Find all columns with _Score in their name
        scoreColumns = headers.filter(header => header.includes('_Score'));
        
        // Make sure Age column exists
        if (!headers.includes('Age')) {
            filePreview.innerHTML = `<p>CSV must contain the 'Age' column</p>`;
            return;
        }
        
        // Check for Student_ID column
        if (!headers.includes('Student_ID')) {
            filePreview.innerHTML = `<p>CSV must contain the 'Student_ID' column</p>`;
            return;
        }
        
        // Map the indices of required columns from the CSV header
        columnIndexes = {};
        headers.forEach((column, index) => {
            columnIndexes[column] = index;
        });

        // Store the rows data
        rowsData = [];
        ageData = [];

        // Capture unique ages and populate age filter dropdown
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= headers.length) {
                // Store row data
                rowsData.push(row);
                
                // Capture unique ages
                const age = row[columnIndexes['Age']];
                if (age && !ageData.includes(age)) {
                    ageData.push(age);
                }
            }
        }

        // Enable and populate the dropdown filter for age (Chronological order)
        const ageFilter = document.getElementById('age-filter');
        ageFilter.disabled = false;
        ageData = [...new Set(ageData)];  // Ensure unique ages
        ageData.sort((a, b) => a - b);  // Sort ages in ascending order
        ageFilter.innerHTML = '<option value="">All Ages</option>';
        ageData.forEach(age => {
            ageFilter.innerHTML += `<option value="${age}">${age}</option>`;
        });
        
        // Populate the score type filter dropdown
        const scoreTypeFilter = document.getElementById('score-type-filter');
        scoreTypeFilter.disabled = false;
        scoreTypeFilter.innerHTML = '<option value="">All Scores</option>';
        scoreColumns.forEach(column => {
            const displayName = column.replace('_Score', '');
            scoreTypeFilter.innerHTML += `<option value="${column}">${displayName}</option>`;
        });
        
        // Populate chart score type filter as well
        const chartScoreTypeFilter = document.getElementById('chart-score-filter');
        if (chartScoreTypeFilter) {
            chartScoreTypeFilter.disabled = false;
            chartScoreTypeFilter.innerHTML = '';
            scoreColumns.forEach(column => {
                const displayName = column.replace('_Score', '');
                chartScoreTypeFilter.innerHTML += `<option value="${column}">${displayName}</option>`;
            });
            // Select first score type by default
            if (scoreColumns.length > 0) {
                chartScoreTypeFilter.value = scoreColumns[0];
            }
        }
        
        // Populate chart age filter
        const chartAgeFilter = document.getElementById('chart-age-filter');
        if (chartAgeFilter) {
            chartAgeFilter.disabled = false;
            chartAgeFilter.innerHTML = '<option value="">All Ages</option>';
            ageData.forEach(age => {
                chartAgeFilter.innerHTML += `<option value="${age}">${age}</option>`;
            });
        }
        
        // Enable chart filter dropdown
        const chartFilterDropdown = document.getElementById('chart-filter');
        if (chartFilterDropdown) {
            chartFilterDropdown.disabled = false;
        }
        
        // Build the table with all data
        buildTable(rowsData, scoreColumns);
        
        // Initialize chart if data is loaded
        if (rowsData.length > 0) {
            updateChart();
        }
    };

    reader.readAsText(fileInput.files[0]);
    showSaveDataButton();
}

// Function to build the table based on filtered data and columns
function buildTable(rows, columns) {
    const tableOutput = document.getElementById('table-output');
    const scoreTypeFilter = document.getElementById('score-type-filter');
    const isSpecificScoreSelected = scoreTypeFilter.value !== "";
    
    let table = '<table border="1"><thead><tr>';

    // Include Student_ID only when a specific score type is selected
    if (isSpecificScoreSelected) {
        table += '<th>Student_ID</th>';
    }
    
    // Always include Age column
    table += '<th>Age</th>';
    
    // Add filtered score columns with clean headers
    columns.forEach(column => {
        // Remove _Score from display name
        const displayName = column.replace('_Score', '');
        table += `<th>${displayName}</th>`;
    });

    table += '</tr></thead><tbody>';

    rows.forEach(row => {
        table += '<tr>';
        
        // Add Student_ID cell only when a specific score type is selected
        if (isSpecificScoreSelected) {
            table += `<td>${row[columnIndexes['Student_ID']]}</td>`;
        }
        
        // Add Age cell
        table += `<td>${row[columnIndexes['Age']]}</td>`;
        
        // Add score cells for the filtered columns
        columns.forEach(column => {
            table += `<td>${row[columnIndexes[column]]}</td>`;
        });
        
        table += '</tr>';
    });

    table += '</tbody></table>';
    tableOutput.innerHTML = table;
}

document.addEventListener("DOMContentLoaded", function () {
    // Default sample data
    const defaultData = [
        { x: 18, y: 75 },
        { x: 19, y: 80 },
        { x: 20, y: 85 },
        { x: 21, y: 90 },
        { x: 22, y: 78 },
        { x: 23, y: 88 },
        { x: 24, y: 95 }
    ];

    const ctx = document.getElementById("chart-output").getContext("2d");

    // Initialize default chart
    chart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [{
                label: "Sample Data (Age vs Score)",
                data: defaultData,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                radius: 5,
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Age" } },
                y: { title: { display: true, text: "Score" } }
            }
        }
    });
    
    // Add event listeners for filter dropdowns
    const ageFilter = document.getElementById('age-filter');
    if (ageFilter) {
        ageFilter.addEventListener('change', applyFilters);
    }
    
    const scoreTypeFilter = document.getElementById('score-type-filter');
    if (scoreTypeFilter) {
        scoreTypeFilter.addEventListener('change', applyFilters);
    }
    
    // Add event listeners for chart filters
    const chartFilterDropdown = document.getElementById('chart-filter');
    if (chartFilterDropdown) {
        chartFilterDropdown.addEventListener('change', function() {
            // Enable or disable age filter based on chart filter selection
            const chartAgeFilter = document.getElementById('chart-age-filter');
            if (chartAgeFilter) {
                // Disable age filter when pearson correlation is selected
                if (this.value === 'pearson') {
                    chartAgeFilter.disabled = true;
                    chartAgeFilter.value = ""; // Reset to All Ages
                } else {
                    chartAgeFilter.disabled = false;
                }
            }
            updateChart();
        });
    }

    const chartAgeFilter = document.getElementById('chart-age-filter');
    if (chartAgeFilter) {
        chartAgeFilter.addEventListener('change', updateChart);
    }
    
    const chartScoreFilter = document.getElementById('chart-score-filter');
    if (chartScoreFilter) {
        chartScoreFilter.addEventListener('change', updateChart);
    }
});

// Function to round numbers for chart display with specified decimal places
function roundForChart(value, decimalPlaces = 0) {
    return Math.round(value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const modal = document.getElementById('processing-modal');
    const closeModal = document.querySelector('.close-modal');
    const continueButton = document.getElementById('continue-button');
    const rowsProcessedElement = document.getElementById('rows-processed');
    const invalidValuesElement = document.getElementById('invalid-values');
    const columnErrorsElement = document.getElementById('column-errors');
    
    // Add to your existing previewFile function or create a new function
    window.processFile = function(data) {
      let rowsProcessed = 0;
      let invalidValues = 0;
      let missingColumns = [];
      let requiredColumns = ['Student_ID', 'Age'];
      
      // Check if the file has required columns
      const headers = data[0];
      
      requiredColumns.forEach(column => {
        if (!headers.includes(column)) {
          missingColumns.push(column);
        }
      });
      
      // Check for at least one score column
      const scoreColumns = headers.filter(header => header.endsWith('_Score'));
      if (scoreColumns.length === 0) {
        missingColumns.push("At least one column ending with '_Score'");
      } else {
        scoreColumnsFound = true;
      }
      
      // Count rows and check for invalid values
      if (data.length > 1) {
        rowsProcessed = data.length - 1; // Excluding header row
        
        // Check for invalid values in Age and Score columns
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const ageIndex = headers.indexOf('Age');
          
          // Check Age
          if (ageIndex !== -1 && (isNaN(parseFloat(row[ageIndex])) || row[ageIndex] === '')) {
            invalidValues++;
            continue;
          }
          
          // Check Score columns
          for (const scoreCol of scoreColumns) {
            const scoreIndex = headers.indexOf(scoreCol);
            if (isNaN(parseFloat(row[scoreIndex])) || row[scoreIndex] === '') {
              invalidValues++;
              break; // Count the row only once
            }
          }
        }
      }
      
      // Update modal with processing results
      rowsProcessedElement.textContent = rowsProcessed;
      invalidValuesElement.textContent = invalidValues;
      
      // Display missing columns
      columnErrorsElement.innerHTML = '';
      if (missingColumns.length > 0) {
        const errorTitle = document.createElement('div');
        errorTitle.textContent = 'Missing required columns:';
        errorTitle.style.color = '#ff6b6b';
        errorTitle.style.marginBottom = '10px';
        columnErrorsElement.appendChild(errorTitle);
        
        missingColumns.forEach(column => {
          const errorElem = document.createElement('div');
          errorElem.textContent = column;
          errorElem.className = 'missing-column';
          columnErrorsElement.appendChild(errorElem);
        });
        
        continueButton.disabled = true;
      } else {
        continueButton.disabled = false;
      }
      
      // Show the modal
      modal.style.display = 'block';
      
      return {
        canProceed: missingColumns.length === 0,
        rowsProcessed,
        invalidValues,
        missingColumns
      };
    };
    
    // Close modal when X is clicked
    closeModal.addEventListener('click', function() {
      modal.style.display = 'none';
    });
    
    // Close modal when Continue button is clicked
    continueButton.addEventListener('click', function() {
      modal.style.display = 'none';
      // Add additional logic here to continue processing if needed
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Modify your existing previewFile function to include the modal
    const originalPreviewFile = window.previewFile;
    window.previewFile = function() {
      const fileInput = document.getElementById('file-upload');
      const file = fileInput.files[0];
      
      if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const csvContent = e.target.result;
          const lines = csvContent.split('\n');
          const data = lines.map(line => line.split(',').map(item => item.trim()));
          
          // Process the file and show modal
          const processingResult = processFile(data);
          
          // Only proceed with the original preview if we can continue
          if (processingResult.canProceed) {
            // Call the original function after closing the modal
            continueButton.onclick = function() {
              modal.style.display = 'none';
              
              if (typeof originalPreviewFile === 'function') {
                originalPreviewFile();
              } else {
 
                displayFileData(data);
              }
            };
          }
        };
        
        reader.readAsText(file);
      }
    };
  });

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for the save button
    document.getElementById('save-data-button').addEventListener('click', saveDataAsCSV);
    
    // Initially hide the save button
    hideSaveDataButton();
});